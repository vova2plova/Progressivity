# Progressivity — Таск-трекер с отслеживанием прогресса

## Цель проекта
Прогрессивный таск-трекер, позволяющий создавать рекурсивные деревья задач с измеримым прогрессом (страницы, километры, часы и т.д.) и визуализировать прогресс на всех уровнях вложенности.

## Основные возможности
- Рекурсивные деревья задач — неограниченная вложенность
- Измеримый прогресс — страницы, километры, часы, штуки
- Бинарные задачи — простые чеклисты (сделано / не сделано)
- Автоматический расчёт прогресса — от листьев до корня
- Комбинированное отображение — "3 из 10 завершено" + "35% общий прогресс"
- JWT-аутентификация — access + refresh tokens

## Технологический стек
### Backend
- **Язык**: Go 1.25.0
- **База данных**: PostgreSQL 18
- **Архитектура**: Clean Architecture
- **HTTP Router**: стандартный `net/http` (Go 1.22+ с паттернами маршрутов)
- **Аутентификация**: JWT (Access + Refresh tokens)
- **Миграции**: golang-migrate
- **Зависимости**: github.com/google/uuid, github.com/lib/pq, github.com/golang-jwt/jwt/v5, golang.org/x/crypto

### Frontend
- **Фреймворк**: React 19 с TypeScript
- **Сборщик**: Vite
- **UI-компоненты**: Radix UI
- **Стилизация**: Tailwind CSS
- **Серверный стейт**: TanStack Query (React Query)
- **HTTP клиент**: Axios
- **Маршрутизация**: React Router DOM
- **Иконки**: Lucide React

## Структура проекта
```
progressivity/
├── cmd/api/                    # Точка входа приложения
├── internal/                   # Внутренние пакеты (Clean Architecture)
│   ├── domain/                # Сущности и интерфейсы (ядро, без зависимостей)
│   ├── usecase/               # Бизнес-логика (зависит только от domain)
│   ├── repository/            # Интерфейсы репозиториев
│   ├── delivery/http/         # HTTP-слой (handlers, middleware, DTO)
│   └── infrastructure/        # Реализации внешних зависимостей (PostgreSQL, JWT)
├── migrations/                # SQL-миграции (golang-migrate формат)
├── pkg/                       # Вспомогательные пакеты (config, logger)
├── web/                       # React frontend
│   └── src/
│       ├── components/        # Переиспользуемые UI компоненты
│       ├── pages/             # Страницы приложения
│       ├── api/               # API клиенты и хуки
│       ├── hooks/             # Кастомные React хуки
│       ├── store/             # Состояние (mock store, контексты)
│       └── types/             # TypeScript типы
├── docker-compose.yml         # Контейнеризация PostgreSQL
├── Makefile                   # Автоматизация команд
└── go.mod                     # Зависимости Go
```

## Ключевые документы
- **PRD.md** — Product Requirements Document (требования к продукту)
- **TASKS.md** — План реализации (фазы 0-13, что сделано/осталось)
- **AGENTS.md** — Инструкции для AI-агентов
- **README.md** — Общая документация проекта