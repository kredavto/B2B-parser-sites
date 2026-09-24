# 📦 Пошаговая инструкция по деплою на GitHub Pages

Этот документ содержит детальную инструкцию по развертыванию приложения AI Lead Generation Pipeline на GitHub Pages с использованием GitHub Actions.

---

## 🎯 Что мы сделаем

1. Создадим workflow файл для автоматического деплоя
2. Настроим базовый путь для GitHub Pages
3. Запушим изменения в репозиторий
4. Включим GitHub Pages
5. Дождёмся автоматического деплоя

---

## 📋 Предварительные требования

- ✅ Аккаунт на GitHub
- ✅ Репозиторий `B2B-parser-sites` создан
- ✅ Git установлен на вашем компьютере
- ✅ Node.js 18+ установлен (опционально, для локальной сборки)

---

## 🚀 Пошаговая инструкция

### Шаг 1: Клонируйте репозиторий

Откройте терминал и выполните:

```bash
git clone https://github.com/kredavto/B2B-parser-sites.git
cd B2B-parser-sites
```

### Шаг 2: Скопируйте файлы проекта

Скопируйте все файлы из текущей директории в клонированный репозиторий:

**Вариант A: Через файловый менеджер**
- Откройте папку с проектом
- Скопируйте все файлы и папки
- Вставьте в папку `B2B-parser-sites`

**Вариант B: Через терминал (Linux/Mac)**
```bash
# Путь к исходному проекту
SOURCE_PATH="/path/to/your/project"

# Копируем все файлы
cp -r $SOURCE_PATH/.github ./
cp -r $SOURCE_PATH/public ./
cp -r $SOURCE_PATH/src ./
cp $SOURCE_PATH/index.html ./
cp $SOURCE_PATH/package.json ./
cp $SOURCE_PATH/package-lock.json ./
cp $SOURCE_PATH/tsconfig.json ./
cp $SOURCE_PATH/vite.config.js ./
cp $SOURCE_PATH/README.md ./
cp $SOURCE_PATH/DEPLOY.md ./
```

**Вариант C: Через терминал (Windows PowerShell)**
```powershell
# Путь к исходному проекту
$SOURCE_PATH = "C:\path\to\your\project"

# Копируем файлы
Copy-Item -Path "$SOURCE_PATH\.github" -Destination . -Recurse
Copy-Item -Path "$SOURCE_PATH\public" -Destination . -Recurse
Copy-Item -Path "$SOURCE_PATH\src" -Destination . -Recurse
Copy-Item -Path "$SOURCE_PATH\index.html" -Destination .
Copy-Item -Path "$SOURCE_PATH\package.json" -Destination .
Copy-Item -Path "$SOURCE_PATH\package-lock.json" -Destination .
Copy-Item -Path "$SOURCE_PATH\tsconfig.json" -Destination .
Copy-Item -Path "$SOURCE_PATH\vite.config.js" -Destination .
Copy-Item -Path "$SOURCE_PATH\README.md" -Destination .
Copy-Item -Path "$SOURCE_PATH\DEPLOY.md" -Destination .
```

### Шаг 3: Обновите vite.config.js

Откройте файл `vite.config.js` и добавьте строку `base`:

```javascript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/B2B-parser-sites/',  // ← ДОБАВЬТЕ ЭТУ СТРОКУ
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
  },
});
```

**Важно**: Строка `base: '/B2B-parser-sites/'` должна точно соответствовать имени вашего репозитория. Если репозиторий называется по-другому, измените путь соответственно.

### Шаг 4: Проверьте структуру проекта

Убедитесь, что структура выглядит так:

```
B2B-parser-sites/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── public/
│   └── 404.html
├── src/
│   ├── App.tsx
│   ├── data/
│   │   └── leads.ts
│   ├── index.css
│   └── main.tsx
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.js
├── README.md
└── DEPLOY.md
```

### Шаг 5: Закоммитьте изменения

```bash
git add .
git commit -m "Add AI Lead Generation Pipeline with GitHub Pages deployment"
```

### Шаг 6: Запушьте в GitHub

```bash
git push origin main
```

Если у вас другая ветка по умолчанию (например, `master`), используйте:

```bash
git push origin master
```

### Шаг 7: Включите GitHub Pages

1. Откройте ваш репозиторий на GitHub: `https://github.com/kredavto/B2B-parser-sites`
2. Перейдите в **Settings** (Настройки)
3. В левом меню выберите **Pages**
4. В разделе **Build and deployment**:
   - **Source**: выберите **GitHub Actions**
   
   ![GitHub Pages Settings](https://docs.github.com/assets/cb-61128/mw-1440/images/help/pages/pages-workflow-btn.webp)

### Шаг 8: Дождитесь завершения деплоя

1. Перейдите в вкладку **Actions** в вашем репозитории
2. Вы увидите запущенный workflow **Deploy to GitHub Pages**
3. Дождитесь завершения (обычно 2-3 минуты)
4. Когда workflow завершится успешно, вы увидите зелёную галочку ✓

### Шаг 9: Откройте ваш сайт

Ваш сайт будет доступен по адресу:

```
https://kredavto.github.io/B2B-parser-sites/
```

Замените `kredavto` на ваше имя пользователя GitHub, если оно отличается.

---

## 🔧 Устранение неполадок

### Проблема: Сайт не открывается (404)

**Решение**:
1. Проверьте, что в `vite.config.js` указана правильная строка `base`
2. Убедитесь, что имя в `base` точно совпадает с именем репозитория
3. Проверьте, что GitHub Pages включён и источник — **GitHub Actions**

### Проблема: Workflow не запускается

**Решение**:
1. Убедитесь, что файл `.github/workflows/deploy.yml` существует
2. Проверьте, что вы запушили изменения в ветку `main` (или `master`)
3. Проверьте вкладку **Actions** — там должны быть ошибки

### Проблема: Белый экран после деплоя

**Решение**:
1. Откройте консоль браузера (F12)
2. Проверьте ошибки — скорее всего проблема с путями к ресурсам
3. Убедитесь, что `base` в `vite.config.js` указан правильно
4. Пересоберите проект: `npm run build` и запушьте снова

### Проблема: Стили не загружаются

**Решение**:
1. Проверьте, что Tailwind CSS правильно настроен
2. Убедитесь, что все зависимости установлены: `npm install`
3. Проверьте вкладку **Network** в консоли браузера

---

## 🔄 Обновление сайта

Когда вы хотите обновить сайт:

1. Внесите изменения в код
2. Закоммитьте изменения:
   ```bash
   git add .
   git commit -m "Update: описание изменений"
   git push origin main
   ```
3. GitHub Actions автоматически пересоберёт и задеплоит сайт
4. Подождите 2-3 минуты
5. Обновите страницу сайта (Ctrl+F5 для жёсткого обновления)

---

## 📊 Мониторинг деплоя

### Просмотр логов

1. Перейдите в вкладку **Actions**
2. Выберите нужный workflow run
3. Нажмите на job **deploy**
4. Просмотрите логи каждого шага

### Откат к предыдущей версии

Если новый деплой сломал сайт:

1. Найдите предыдущий успешный коммит
2. Откатитесь к нему:
   ```bash
   git reset --hard <commit-hash>
   git push --force origin main
   ```
3. GitHub Actions автоматически задеплоит предыдущую версию

---

## 🎨 Кастомизация

### Изменение названия сайта

Откройте `index.html` и измените:

```html
<title>AI Lead Generation Pipeline — B2B Web Development</title>
```

### Изменение иконки (favicon)

Добавьте файл `favicon.ico` в папку `public/` и добавьте в `index.html`:

```html
<link rel="icon" type="image/x-icon" href="/B2B-parser-sites/favicon.ico">
```

### Добавление аналитики

Добавьте скрипт Google Analytics в `index.html` перед закрывающим тегом `</head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

---

## 📱 Локальная разработка

Если хотите запустить проект локально:

```bash
# Установите зависимости
npm install

# Запустите dev-сервер
npm run dev

# Откройте http://localhost:3000
```

Для production-сборки:

```bash
# Соберите проект
npm run build

# Результат в папке dist/
```

---

## 📞 Поддержка

Если возникли проблемы:

1. Проверьте раздел **Устранение неполадок** выше
2. Проверьте логи в вкладке **Actions**
3. Создайте Issue в репозитории с описанием проблемы

---

## ✅ Чек-лист деплоя

- [ ] Клонирован репозиторий
- [ ] Скопированы все файлы проекта
- [ ] Добавлена строка `base` в `vite.config.js`
- [ ] Проверена структура проекта
- [ ] Закоммичены изменения
- [ ] Запушено в GitHub
- [ ] Включён GitHub Pages (Source: GitHub Actions)
- [ ] Workflow успешно завершён
- [ ] Сайт открывается по адресу

---

**Готово!** 🎉 Ваш AI Lead Generation Pipeline теперь доступен онлайн.
