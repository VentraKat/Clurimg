/**
 * Clurimg.js - Библиотека для динамической перекраски изображений
 * https://github.com/VentraKat/Clurimg
 */

(function (global) {
    // Глобальный кэш перекрашенных изображений
    const imageRecolorCache = new Map();
    let defaultAccentHex = "#3498db"; // Цвет по умолчанию, если не передан вручную

    // ===============================
    // Утилиты цвета
    // ===============================
    function normalizeHex(hex) {
        if (!hex) return defaultAccentHex;
        hex = hex.toString().trim();
        return hex.startsWith("#") ? hex : "#" + hex;
    }

    function hexToRgb(hex) {
        hex = normalizeHex(hex).replace("#", "");
        if (hex.length === 3) {
            hex = hex.split("").map(c => c + c).join("");
        }
        return {
            r: parseInt(hex.substring(0, 2), 16) || 0,
            g: parseInt(hex.substring(2, 4), 16) || 0,
            b: parseInt(hex.substring(4, 6), 16) || 0
        };
    }

    function rgbToHslObj({ r, g, b }) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = 0;
            s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return { h, s, l };
    }

    function hslToRgbObj({ h, s, l }) {
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = function (p, q, t) {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;

            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    function isRedHue(hue) {
        const redRange1 = hue <= 0.1 || hue >= 0.94;
        const redRange2 = hue >= 0.9 && hue <= 1.0;
        return redRange1 || redRange2;
    }

    // ===============================
    // Поиск и замена в CSS правилах
    // ===============================
    function findAndReplaceInCSSRules(selector, oldUrl, newUrl) {
        const sheets = document.styleSheets;
        let modified = false;

        for (let i = 0; i < sheets.length; i++) {
            const sheet = sheets[i];
            try {
                const rules = sheet.cssRules || sheet.rules;
                if (!rules) continue;

                for (let j = 0; j < rules.length; j++) {
                    const rule = rules[j];
                    if (rule.type === CSSRule.STYLE_RULE && rule.selectorText === selector) {
                        rule.style.backgroundImage = `url("${newUrl}")`;
                        modified = true;
                    }
                }
            } catch (e) {
                // Игнорируем кросс-доменные ограничения стилей
            }
        }

        return modified;
    }

    // ===============================
    // Перекраска Canvas
    // ===============================
    function recolorImage(src, targetColor = defaultAccentHex, fullFill = false, maxResize = null) {
        return new Promise((resolve) => {
            if (!src) return resolve(null);

            const accentRgb = typeof targetColor === "object" && targetColor.r !== undefined 
                ? targetColor 
                : hexToRgb(targetColor);
            const accentHsl = rgbToHslObj(accentRgb);

            const cacheKey = `${src}_${accentRgb.r}_${accentRgb.g}_${accentRgb.b}_${fullFill}_${maxResize || 'full'}`;
            if (imageRecolorCache.has(cacheKey)) {
                resolve(imageRecolorCache.get(cacheKey));
                return;
            }

            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = src;

            img.onload = () => {
                let targetWidth = img.width;
                let targetHeight = img.height;

                if (maxResize && (img.width > maxResize || img.height > maxResize)) {
                    if (img.width > img.height) {
                        targetWidth = maxResize;
                        targetHeight = Math.round((img.height * maxResize) / img.width);
                    } else {
                        targetHeight = maxResize;
                        targetWidth = Math.round((img.width * maxResize) / img.height);
                    }
                }

                const canvas = document.createElement("canvas");
                canvas.width = targetWidth;
                canvas.height = targetHeight;

                const ctx = canvas.getContext("2d", { willReadFrequently: true });
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                let changed = false;

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const a = data[i + 3];

                    if (a === 0) continue;

                    if (fullFill) {
                        data[i] = accentRgb.r;
                        data[i + 1] = accentRgb.g;
                        data[i + 2] = accentRgb.b;
                        changed = true;
                    } else {
                        const pixelHsl = rgbToHslObj({ r, g, b });

                        if (isRedHue(pixelHsl.h)) {
                            let newL;

                            if (accentHsl.s > 0.1 && accentHsl.l > 0.1 && accentHsl.l < 0.9) {
                                newL = pixelHsl.l;
                            } else {
                                if (pixelHsl.l <= 0.5) {
                                    newL = (pixelHsl.l / 0.5) * accentHsl.l;
                                } else {
                                    newL = accentHsl.l + ((pixelHsl.l - 0.5) / 0.5) * (1 - accentHsl.l);
                                }
                            }

                            const newS = pixelHsl.s * accentHsl.s;
                            const newRgb = hslToRgbObj({ h: accentHsl.h, s: newS, l: newL });

                            data[i] = newRgb.r;
                            data[i + 1] = newRgb.g;
                            data[i + 2] = newRgb.b;
                            changed = true;
                        }
                    }
                }

                if (!changed) {
                    imageRecolorCache.set(cacheKey, null);
                    resolve(null);
                    return;
                }

                ctx.putImageData(imageData, 0, 0);
                const resultDataUrl = canvas.toDataURL();
                imageRecolorCache.set(cacheKey, resultDataUrl);
                resolve(resultDataUrl);
            };

            img.onerror = () => {
                console.error("[Clurimg] Ошибка загрузки изображения:", src);
                resolve(null);
            };
        });
    }

    // ===============================
    // Парсер селекторов
    // ===============================
    function parseSelectorString(str) {
        const patterns = [
            /document\.querySelectorAll\s*\(\s*['"]([^'"]*)['"]\s*\)/,
            /document\.querySelector\s*\(\s*['"]([^'"]*)['"]\s*\)/,
            /document\.getElementById\s*\(\s*['"]([^'"]*)['"]\s*\)/,
            /document\.getElementsByClassName\s*\(\s*['"]([^'"]*)['"]\s*\)/,
            /document\.getElementsByTagName\s*\(\s*['"]([^'"]*)['"]\s*\)/,
            /getElementById\s*\(\s*['"]([^'"]*)['"]\s*\)/,
            /getElementsByClassName\s*\(\s*['"]([^'"]*)['"]\s*\)/,
            /getElementsByTagName\s*\(\s*['"]([^'"]*)['"]\s*\)/,
        ];

        for (const pattern of patterns) {
            const match = str.match(pattern);
            if (match) return { selector: match[1] };
        }

        return { selector: str };
    }

    function getElementsSafely(selectorString) {
        if (typeof selectorString === 'string') {
            const parsed = parseSelectorString(selectorString);
            return document.querySelectorAll(parsed.selector);
        } else if (selectorString instanceof Element) {
            return [selectorString];
        } else if (selectorString instanceof NodeList || Array.isArray(selectorString)) {
            return selectorString;
        }
        return [];
    }

    // =====================================================
    // Применение к DOM элементам / CSS
    // =====================================================
    async function changeaccentimg(selectorString, type = "img", targetColor = defaultAccentHex, fullFill = false, originalSrc = null) {
        const accentHex = normalizeHex(targetColor);
        const accentRgb = hexToRgb(accentHex);
        const accentHsl = rgbToHslObj(accentRgb);

        const isTemplateMode = type === "css" && originalSrc && (originalSrc.includes('${output}') || originalSrc.includes('?{output}'));

        // Режим глобального CSS правила
        if (type === "css" && !isTemplateMode) {
            if (!originalSrc) {
                console.error("[Clurimg] Не указан originalSrc для CSS режима");
                return;
            }

            const result = await recolorImage(originalSrc, accentHex, fullFill, null);
            if (result) {
                findAndReplaceInCSSRules(selectorString, originalSrc, result);
            }
            return;
        }

        const elements = getElementsSafely(selectorString);
        if (!elements || elements.length === 0) return;

        for (const el of elements) {
            let imgSrc = null;
            let cssVarName = null;

            let maxResize = 256;
            const rect = el.getBoundingClientRect();
            const maxDim = Math.max(rect.width, rect.height);
            if (maxDim > 0) {
                const dpr = window.devicePixelRatio || 1;
                maxResize = Math.min(512, Math.ceil(maxDim * dpr));
            }

            if (isTemplateMode) {
                const matchProp = originalSrc.match(/([a-zA-Z0-9_-]+)\s*:/);
                cssVarName = matchProp ? matchProp[1] : null;

                if (cssVarName) {
                    const bg = window.getComputedStyle(el).getPropertyValue(cssVarName).trim();
                    if (bg && bg !== "none") {
                        imgSrc = bg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '').replace(/^["']|["']$/g, '').trim();
                    }
                }

                if (!imgSrc) {
                    const bg = window.getComputedStyle(el).backgroundImage;
                    if (bg && bg !== "none") {
                        imgSrc = bg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
                    }
                }
            } else if (type === "img") {
                imgSrc = el.getAttribute("src");
            } else if (type === "div" || type === "bg") {
                const bg = window.getComputedStyle(el).backgroundImage;
                if (bg && bg !== "none") {
                    imgSrc = bg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
                }
            }

            if (!imgSrc) continue;

            const result = await recolorImage(imgSrc, accentHex, fullFill, maxResize);
            if (!result) continue;

            if (isTemplateMode) {
                if (cssVarName) {
                    const valueTemplate = originalSrc.substring(originalSrc.indexOf(':') + 1).trim().replace(/;$/, '');
                    const finalValue = valueTemplate.replace(/\$\{output\}|\?\{output\}/g, result);
                    el.style.setProperty(cssVarName, finalValue);
                } else {
                    const finalCssText = originalSrc.replace(/\$\{output\}|\?\{output\}/g, result);
                    el.style.cssText += `; ${finalCssText}`;
                }
            } else if (type === "img") {
                el.src = result;
            } else {
                el.style.backgroundImage = `url(${result})`;
            }
        }
    }

    // =====================================================
    // Получение DataURL с кастомным действием или коллбеком
    // =====================================================
    async function accentcolorofimage(src, targetColor = defaultAccentHex, actionOrCallback = null) {
        const accentHex = normalizeHex(targetColor);
        const resultImage = await recolorImage(src, accentHex, false);

        if (!resultImage) {
            console.log("[Clurimg] Изображение не изменилось или ошибка загрузки.");
            return null;
        }

        if (typeof actionOrCallback === "function") {
            actionOrCallback(resultImage);
            return resultImage;
        }

        if (typeof actionOrCallback === "string") {
            const allowedActions = {
                'setBackgroundImage': (img) => { document.body.style.backgroundImage = `url(${img})`; },
                'setIconImage': (img) => {
                    const icon = document.querySelector('.icon');
                    if (icon) icon.src = img;
                },
                'logImage': (img) => { console.log('[Clurimg Result]:', img); },
                'applyToElement': (img, selector) => {
                    const el = document.querySelector(selector);
                    if (el) el.style.backgroundImage = `url(${img})`;
                }
            };

            const actionMatch = actionOrCallback.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/);
            if (actionMatch) {
                const actionName = actionMatch[1];
                if (allowedActions[actionName]) {
                    const argsMatch = actionOrCallback.match(/\(([^)]*)\)/);
                    const args = argsMatch ? argsMatch[1].split(',').map(a => a.trim().replace(/['"]/g, '')) : [];
                    allowedActions[actionName](resultImage, ...args);
                }
            }
        }

        return resultImage;
    }

    // ===============================
    // Экспорт API в глобальную область
    // ===============================
    const Clurimg = {
        recolor: recolorImage,
        apply: changeaccentimg,
        process: accentcolorofimage,
        setDefaultColor: (hex) => { defaultAccentHex = normalizeHex(hex); },
        clearCache: () => imageRecolorCache.clear()
    };

    global.Clurimg = Clurimg;
    global.recolorImage = recolorImage;
    global.changeaccentimg = changeaccentimg;
    global.accentcolorofimage = accentcolorofimage;

})(typeof window !== "undefined" ? window : this);