# Progressivity

Таск-трекер с отслеживанием прогресса по задачам.

Создавайте цели, декомпозируйте их на подзадачи любой глубины вложенности, задавайте количественные метрики (страницы, километры, часы) и отслеживайте прогресс на каждом уровне иерархии.

## Возможности

- Рекурсивные деревья задач — неограниченная вложенность
- Измеримый прогресс — страницы, километры, часы, штуки
- Бинарные задачи — простые чеклисты (сделано / не сделано)
- Автоматический расчёт прогресса — от листьев до корня
- Комбинированное отображение — "3 из 10 завершено" + "35% общий прогресс"
- JWT-аутентификация — access + refresh tokens

## Пример

```
Цель: Прочитать 10 книг за год
├── Рыцарь семи королевств (300 стр.) ████████░░░░ 33%
├── Война и мир (1200 стр.)           ██████████░░ 60%
├── Хоббит (310 стр.)                 ████████████ 100% ✓
└── ...ещё 7 книг

Завершено: 1 из 10 | Общий прогресс: 19%
```

## Технологический стек

**Backend:** Go, PostgreSQL 18, Clean Architecture, JWT

**Frontend:** React 19, TypeScript, Vite, Radix UI, Tailwind CSS, TanStack Query

## Быстрый старт

### Требования

- Go 1.22+
- Node.js 20+
- Docker и Docker Compose
- Make

### Запуск

```bash
# Клонировать репозиторий
git clone https://github.com/your-username/progressivity.git
cd progressivity

# Скопировать конфигурацию
cp .env.example .env

# Поднять PostgreSQL
docker compose up -d

# Применить миграции
make migrate-up

# Запустить backend
make run

# Запустить frontend (в другом терминале)
cd web
npm install
npm run dev
```

Приложение будет доступно:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080/api/v1

## Структура проекта

```
progressivity/
├── cmd/api/             — точка входа
├── internal/
│   ├── domain/          — сущности и интерфейсы (ядро)
│   ├── usecase/         — бизнес-логика
│   ├── repository/      — интерфейсы репозиториев
│   ├── delivery/http/   — HTTP handlers, middleware, DTO
│   └── infrastructure/  — PostgreSQL, JWT реализации
├── migrations/          — SQL-миграции
├── pkg/                 — конфигурация, логирование
├── web/                 — React frontend
├── docker-compose.yml
└── Makefile
```

## API

Все эндпоинты с префиксом `/api/v1`.

| Метод | Путь | Описание |
|-------|------|----------|
| POST | /auth/register | Регистрация |
| POST | /auth/login | Логин |
| POST | /auth/refresh | Обновление токена |
| GET | /tasks | Список целей (top-level) |
| POST | /tasks | Создать цель |
| GET | /tasks/:id | Задача с прогрессом |
| GET | /tasks/:id/tree | Дерево задачи |
| POST | /tasks/:id/children | Создать подзадачу |
| POST | /tasks/:id/progress | Добавить прогресс |

Полная документация API — в [PRD.md](PRD.md).

## Разработка

```bash
# Backend
make build          # сборка
make run            # запуск
make test           # тесты
make migrate-up     # применить миграции
make migrate-down   # откатить миграции

# Frontend
cd web
npm run dev         # dev server
npm run build       # production build
npm run test        # тесты
npm run lint        # линтер
```

## Документация

- [PRD.md](PRD.md) — требования к продукту
- [TASKS.md](TASKS.md) — план реализации
- [AGENTS.md](AGENTS.md) — инструкции для AI-агентов

## Лицензия

MIT
