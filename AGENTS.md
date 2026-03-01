# AGENTS.md — Инструкции для AI-агентов

## Обзор проекта

**Progressivity** — таск-трекер с отслеживанием прогресса по задачам. Позволяет создавать рекурсивные деревья задач с измеримым прогрессом (страницы, километры, часы и т.д.) и визуализировать прогресс на всех уровнях вложенности.

## Документация проекта

Ключевые документы проекта:

- **PRD.md** — Product Requirements Document. Содержит:
  - Видение продукта и целевую аудиторию
  - Сценарии использования
  - Функциональные и нефункциональные требования
  - Доменную модель (сущности, правила, алгоритмы)
  - REST API спецификацию
  - Технологический стек и ограничения

- **TASKS.md** — План реализации. Содержит:
  - Поэтапный план реализации (фазы 0-13)
  - Конкретные задачи для каждой фазы с отметками выполнения
  - Приоритеты (P0, P1, P2)
  - Фронтенд и бэкенд задачи разделены

- **AGENTS.md** — Инструкции для AI-агентов (этот файл). Содержит:
  - Обзор проекта и технологический стек
  - Структуру проекта и архитектурные принципы
  - Доменную модель и REST API
  - Соглашения по коду и тестирование

## Технологический стек

### Backend
- **Язык**: Go (последняя стабильная версия)
- **База данных**: PostgreSQL 18
- **Архитектура**: Clean Architecture
- **HTTP Router**: стандартный `net/http` (Go 1.22+ с паттернами маршрутов) или `chi`
- **Аутентификация**: JWT (Access + Refresh tokens)
- **Миграции**: golang-migrate

### Frontend
- **Фреймворк**: React 19 с TypeScript
- **Сборщик**: Vite
- **UI-компоненты**: Radix UI
- **Стилизация**: Tailwind CSS
- **Серверный стейт**: TanStack Query (React Query)

## Структура проекта

```
progressivity/
├── cmd/
│   └── api/
│       └── main.go                    # Точка входа приложения
├── internal/
│   ├── domain/                        # Сущности и интерфейсы (ядро, без зависимостей)
│   │   ├── task.go                    # Task, ProgressEntry
│   │   ├── user.go                    # User
│   │   └── errors.go                  # Доменные ошибки
│   ├── usecase/                       # Бизнес-логика (зависит только от domain)
│   │   ├── task_usecase.go
│   │   └── auth_usecase.go
│   ├── repository/                    # Интерфейсы репозиториев
│   │   ├── task_repository.go
│   │   └── user_repository.go
│   ├── delivery/                      # HTTP-слой (handlers, middleware, DTO)
│   │   └── http/
│   │       ├── handler/
│   │       │   ├── task_handler.go
│   │       │   └── auth_handler.go
│   │       ├── middleware/
│   │       │   └── auth_middleware.go
│   │       ├── dto/
│   │       │   ├── task_dto.go
│   │       │   └── auth_dto.go
│   │       └── router.go
│   └── infrastructure/                # Реализации внешних зависимостей
│       ├── postgres/
│       │   ├── task_repository.go
│       │   ├── user_repository.go
│       │   └── connection.go
│       └── auth/
│           └── jwt.go
├── migrations/                        # SQL-миграции (golang-migrate формат)
├── pkg/
│   ├── config/
│   └── logger/
├── web/                               # React frontend
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── api/
│       ├── hooks/
│       ├── store/
│       └── types/
├── docker-compose.yml
├── Makefile
├── go.mod
└── go.sum
```

## Архитектурные принципы

### Clean Architecture — правило зависимостей
Зависимости направлены строго **внутрь**:

```
delivery -> usecase -> domain
infrastructure -> domain
```

- `domain/` — **ядро**: сущности, value objects, интерфейсы репозиториев. Не импортирует ничего из проекта.
- `usecase/` — бизнес-логика. Зависит только от `domain/`. Работает с интерфейсами, не с реализациями.
- `repository/` — интерфейсы, определённые в терминах домена.
- `delivery/http/` — HTTP handlers. Преобразует HTTP-запросы в вызовы usecase и обратно.
- `infrastructure/` — реализации интерфейсов (PostgreSQL, JWT). Зависит от `domain/`.

### Правила для кода

1. **Никаких бизнес-правил в handlers** — handlers только парсят запрос, вызывают usecase, формируют ответ.
2. **Никаких SQL в usecase** — вся работа с БД через интерфейсы репозиториев.
3. **Domain не знает о HTTP, SQL, JWT** — чистые Go-структуры и интерфейсы.
4. **DTO отделены от domain entities** — в `delivery/http/dto/` свои структуры для request/response.
5. **Ошибки домена** — определены в `domain/errors.go`, handlers маппят их в HTTP-коды.

## Доменная модель

### Task (Единая сущность, рекурсивная)
- `parent_id = NULL` означает top-level задачу ("Goal")
- Задача может быть **контейнером** (имеет дочерние задачи) или **листом** (имеет target_value и принимает ProgressEntry)
- Бинарная задача: `target_value = NULL`, прогресс определяется по `status`

### ProgressEntry
- Привязана к leaf-задаче
- `value` — инкрементальная прибавка (не абсолютное значение)
- `recorded_at` — когда фактически произошло (может отличаться от `created_at`)

### Расчёт прогресса (рекурсивный)
```
Leaf + target_value:  progress = sum(entries.value) / target_value
Leaf + no target:     progress = status == completed ? 100% : 0%
Container:            progress = avg(children.progress)
```

Отображение для контейнера — комбинация:
- Вариант A: "X из Y подзадач завершено"
- Вариант B: "Средний прогресс: Z%"

## REST API (префикс /api/v1)

### Auth
```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
```

### Tasks
```
GET    /tasks                    — top-level задачи текущего пользователя
POST   /tasks                    — создать top-level задачу
GET    /tasks/:id                — задача с вычисленным прогрессом
PUT    /tasks/:id                — обновить задачу
DELETE /tasks/:id                — удалить задачу (каскадно)
GET    /tasks/:id/children       — прямые дочерние задачи
POST   /tasks/:id/children       — создать дочернюю задачу
GET    /tasks/:id/tree           — полное дерево с прогрессом
PATCH  /tasks/:id/reorder        — изменить позицию
```

### Progress
```
GET    /tasks/:id/progress       — история прогресса
POST   /tasks/:id/progress       — добавить запись прогресса
DELETE /progress/:id             — удалить запись
```

## Соглашения по коду

### Go
- Именование: стандартные Go-конвенции (camelCase для приватных, PascalCase для публичных)
- Обработка ошибок: всегда проверять и возвращать ошибки, не паниковать
- Контекст: передавать `context.Context` первым аргументом во все методы usecase и repository
- UUID: использовать `github.com/google/uuid`
- Логирование: структурированное (slog или zerolog)

### TypeScript/React
- Функциональные компоненты с хуками
- Строгая типизация, избегать `any`
- API-вызовы через отдельный слой в `api/`
- Переиспользуемые компоненты в `components/`, страницы в `pages/`

### SQL/Миграции
- Миграции нумерованные: `000001_create_users.up.sql` / `000001_create_users.down.sql`
- Все таблицы с `created_at`, `updated_at` (timestamptz)
- UUID как первичные ключи
- Каскадное удаление для дочерних задач и progress entries

## Тестирование
- Unit-тесты для usecase (мок репозиториев)
- Integration-тесты для repository (тестовая БД или testcontainers)
- Handler-тесты с httptest
- Frontend: Vitest + React Testing Library
