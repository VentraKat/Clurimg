# 🎨 Clurimg.js

> Легковесная JavaScript-библиотека для динамической перекраски изображений на стороне клиента (замена красных оттенков на любой пользовательский цвет).

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Pure Vanilla JS](https://img.shields.io/badge/dependencies-none-green.svg)]()
[![JavaScript](https://img.shields.io/badge/language-JS-yellow.svg)]()

---

## ✨ Возможности

- 🎯 **Умная замена оттенка (HSL)**: перекрашивает красные участки (`#ff0000` и схожие тона), сохраняя тени, свет и градиенты исходного изображения.
- 🖌️ **Режим полной заливки (`fullFill`)**: позволяет полностью перекрасить непрозрачный силуэт/иконку в монохромный цвет.
- ⚡ **Встроенное кэширование**: повторные запросы на одинаковые изображения и цвета выполняются мгновенно без повторного рендеринга на Canvas.
- 🖼️ **Универсальность**: работает с тегами `<img>`, фонами `background-image` у `<div>`, CSS-правилами и возвращает прямой `DataURL (Base64)`.
- 🪶 **Zero Dependencies**: чистый Vanilla JS без внешних зависимостей, библиотек и фреймворков.

---

## 📦 Подключение к проекту

### 1. Подключение через HTML

Скачайте файл `clurimg.js` в проект и подключите перед закрывающим тегом `</body>` или в секции `<head>`:

```html
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Мой проект</title>
</head>
<body>
    <!-- Ваш контент -->
    <img class="icon" src="assets/red-icon.svg" alt="Иконка">

    <!-- Подключение Clurimg -->
    <script src="path/to/clurimg.js"></script>
    <script>
        // Использование сразу после подключения
        Clurimg.apply('.icon', 'img', '#2ecc71');
    </script>
</body>
</html>
```

или

```html
<script src="./clurimg.js"></script>
```

---

## 🚀 Примеры использования

### 1. Перекраска тегов `<img>`

Перекрасит все элементы `<img class="accent-icon">` в бирюзовый цвет:

```javascript
Clurimg.apply('.accent-icon', 'img', '#1abc9c');
```

---

### 2. Перекраска фона блока `<div>` (`background-image`)

Находит картинку в CSS-свойстве `background-image` элемента и подменяет её на перекрашенную:

```javascript
Clurimg.apply('#card-header', 'div', '#9b59b6');
```

---

### 3. Прямой вызов API (получение DataURL)

Если вам нужно получить результат в виде Base64-строки для использования в коде или сохранения:

```javascript
async function updateImage() {
    const originalSrc = 'images/heart.png';
    const targetColor = '#3498db'; // Синий

    const newImageBase64 = await Clurimg.recolor(originalSrc, targetColor);
    
    if (newImageBase64) {
        document.getElementById('myPreview').src = newImageBase64;
    }
}
```

---

### 4. Режим полной заливки (`fullFill: true`)

Если нужно сделать плоскую монохромную заливку вместо градиентной подгонки HSL:

```javascript
// 4-й аргумент включает полную заливку
Clurimg.apply('.badge-icon', 'img', '#e67e22', true);
```

---

### 5. Глобальная установка цвета по умолчанию

Вы можете один раз задать акцентный цвет для всего приложения:

```javascript
Clurimg.setDefaultColor('#ff5722');

// Теперь цвет можно не указывать при каждом вызове:
Clurimg.apply('.menu-icons', 'img');
```

---

## 📚 Справочник API (API Reference)

### `Clurimg.apply(selector, type, color, fullFill, originalSrc)`
Применяет перекраску напрямую к элементам DOM или глобальным CSS-правилам.

| Параметр | Тип | По умолчанию | Описание |
| :--- | :--- | :--- | :--- |
| `selector` | `string` \| `Element` \| `NodeList` | *(обязательный)* | CSS-селектор (`'.class'`, `'#id'`) или ссылка на DOM-элемент |
| `type` | `string` | `'img'` | Тип цели: `'img'` (для тегов img), `'div'` (для background-image) или `'css'` |
| `color` | `string` \| `object` | `"#3498db"` | Целевой цвет в HEX (`"#00ff00"`, `"00ff00"`) или RGB-объект `{r, g, b}` |
| `fullFill` | `boolean` | `false` | `true` — сплошная заливка; `false` — умное сохранение светотени по HSL |
| `originalSrc`| `string` | `null` | Исходный путь (используется для режима `type: 'css'`) |

---

### `Clurimg.recolor(src, color, fullFill, maxResize)`
Асинхронная функция, перекрашивает изображение и возвращает Promise с результатом в виде `data:image/png;base64,...` (или `null` при ошибке).

| Параметр | Тип | По умолчанию | Описание |
| :--- | :--- | :--- | :--- |
| `src` | `string` | *(обязательный)* | Ссылка на изображение, относительный путь или Data URI |
| `color` | `string` \| `object` | `"#3498db"` | Целевой цвет в HEX или RGB |
| `fullFill` | `boolean` | `false` | Режим сплошной заливки |
| `maxResize` | `number` \| `null` | `null` | Максимальный размер (px) для оптимизации и сжатия холста |

---

### `Clurimg.setDefaultColor(hex)`
Устанавливает цвет по умолчанию для всех последующих операций.

### `Clurimg.clearCache()`
Очищает внутренний кэш обработанных изображений в памяти.

---

## ⚠️ Важное примечание по CORS (Локальное тестирование)

При тестировании внешних растровых картинок (`.png`, `.jpg`) напрямую через протокол `file:///` браузер может заблокировать доступ Canvas к пикселям из соображений безопасности (Tainted Canvas).

Рекомендуется запускать проекты через локальный сервер:
- **VS Code**: плагин *Live Server* (Правый клик по `index.html` → *Open with Live Server*).
- **Node.js**: `npx serve`
- **Python**: `python -m http.server 8000`

> *Примечание: Векторные изображения SVG в формате Data URI (`data:image/svg+xml;...`) работают без ограничений в любом режиме.*

---

## 📄 Лицензия

Распространяется под лицензией **MIT**. Подробности в файле [LICENSE](LICENSE).
