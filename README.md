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

## Production Blueprint

Фаза 1 деплоя зафиксирована как single-VPS схема через Docker Compose без домена:

- `caddy` — единственная публичная точка входа на `:80`
- frontend — production build, отдаваемый через `caddy`
- backend — отдельный контейнер с внутренним портом `8080`
- PostgreSQL — отдельный контейнер с persistent volume и без внешней публикации порта
- внешние URL:
  - UI: `http://<VPS_IP>/`
  - API: `http://<VPS_IP>/api/v1/...`

Ключевые ограничения и решения:

- production-модель для frontend — same-origin, запросы остаются на относительные `/api/v1`
- proxy в [web/vite.config.ts](/D:/git/Progressivity/web/vite.config.ts) используется только для локальной разработки
- backend в production использует текущий контракт конфигурации и читает `SERVER_PORT` без отдельного `SERVER_HOST`
- healthcheck для контейнеров опирается на `GET /api/v1/health`
- миграции для production должны запускаться отдельной командой, а не во время старта backend

Подробная спецификация фазы 1 находится в [docs/deployment-phase1.md](/D:/git/Progressivity/docs/deployment-phase1.md).

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
- [docs/deployment-phase1.md](/D:/git/Progressivity/docs/deployment-phase1.md) — зафиксированная схема первого VPS-деплоя

## Лицензия

MIT
