# 🎯 AI Lead Generation Pipeline — B2B Web Development

Автоматизированная система поиска и анализа потенциальных B2B-клиентов для продажи услуг разработки и редизайна сайтов.

![Pipeline Status](https://img.shields.io/badge/pipeline-active-green)
![Leads](https://img.shields.io/badge/leads-50-blue)
![Coverage](https://img.shields.io/badge/cities-13-purple)

## 📊 Что внутри

- **50 верифицированных лидов** из 13 городов России
- **10+ отраслей**: стоматологии, автосервисы, косметология, фитнес, бухгалтерия, мебель, ремонт, образование, юриспруденция
- **Lead Scoring**: Opportunity Score, Website Need, Sales Potential, Business Activity
- **Персонализированные сообщения**: первое сообщение + 2 follow-up для каждого лида
- **Website Audit**: анализ UX, UI, конверсии, мобильной версии
- **Готовые структуры сайтов** для Top 20 лидов

## 🚀 Деплой на GitHub Pages

### Шаг 1: Включите GitHub Pages

1. Откройте ваш репозиторий на GitHub
2. Перейдите в **Settings** → **Pages**
3. В разделе **Build and deployment** → **Source** выберите **GitHub Actions**

### Шаг 2: Добавьте base path в vite.config.js

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

### Шаг 3: Запушьте изменения

```bash
git add .
git commit -m "Add GitHub Pages deployment config"
git push origin main
```

### Шаг 4: Дождитесь деплоя

1. Перейдите в вкладку **Actions** в вашем репозитории
2. Дождитесь завершения workflow **Deploy to GitHub Pages**
3. Сайт будет доступен по адресу: `https://kredavto.github.io/B2B-parser-sites/`

## 📁 Структура проекта

```
.
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions workflow
├── public/
│   └── 404.html                # SPA redirect для GitHub Pages
├── src/
│   ├── App.tsx                 # Главный компонент приложения
│   ├── data/
│   │   └── leads.ts            # База лидов (50 компаний)
│   ├── index.css               # Стили Tailwind CSS
│   └── main.tsx                # Точка входа
├── index.html                  # HTML шаблон
├── package.json                # Зависимости
├── tsconfig.json               # TypeScript конфигурация
├── vite.config.js              # Vite конфигурация
└── README.md                   # Этот файл
```

## 🎨 Функциональность

### Dashboard
- KPI-карточки: общее количество лидов, приоритеты, средние оценки
- Графики по отраслям и городам
- Распределение приоритетов (A+, A, B)
- Статусы сайтов (No Website, Very Old, Old, Average, Good)
- Pipeline статусы (NEW, VERIFIED, READY_TO_CONTACT)
- Top 5 возможностей

### All Leads
- Таблица всех лидов с фильтрацией
- Фильтры: поиск, приоритет, отрасль, город, сортировка
- Экспорт в CSV
- Детальная карточка каждого лида

### Top 20
- 20 самых перспективных компаний
- Отсортированы по Opportunity Score
- Краткая аналитика по каждому лиду

### Report
- Сводная статистика
- Рейтинг ниш по Opportunity Score
- Рейтинг городов
- Самые частые проблемы сайтов
- Рекомендации по продажам

### Детальная карточка лида
- 4 скоринговых метрики
- Контакты (телефон, email, WhatsApp, Telegram, VK)
- Анализ сайта и главная проблема
- Sales angle
- Why This Lead (персонализированное обоснование)
- Suggested Improvement
- Suggested Site Structure
- 3 готовых сообщения (первое + 2 follow-up)

## 📊 Методология скоринга

**Opportunity Score** = Website Need × 0.50 + Sales Potential × 0.30 + Business Activity × 0.20

### Website Need Score (0-100)
Оценивает потребность в новом сайте:
- 90-100: Сайт отсутствует или критически устарел
- 75-89: Серьёзные проблемы с UX/UI
- 60-74: Средние проблемы
- <60: Сайт работает удовлетворительно

### Sales Potential (0-100)
Оценивает вероятность покупки сайта:
- Масштаб бизнеса
- Количество филиалов
- Ценовой сегмент
- Конкуренция в нише

### Business Activity (0-100)
Оценивает активность бизнеса:
- Свежие отзывы
- Активность в соцсетях
- Вакансии
- Рекламная активность

## 🔍 Источники данных

Все данные собраны из публичных источников:
- Яндекс и Google
- Яндекс Карты и 2ГИС
- Официальные сайты компаний
- Публичные социальные сети
- Отраслевые каталоги

**Важно**: Используются только публичные деловые данные. Никаких персональных данных, скрытых профилей или обхода защит.

## 🛠 Технологии

- **React 18** + **TypeScript**
- **Vite** — сборщик
- **Tailwind CSS** — стилизация
- **GitHub Actions** — автоматический деплой

## 📝 Лицензия

MIT

## 🤝 Контакты

Для вопросов по проекту создайте Issue в этом репозитории.

---

**Статус**: ✅ Проект готов к использованию  
**Последнее обновление**: 2025  
**Количество лидов**: 50 верифицированных компаний
