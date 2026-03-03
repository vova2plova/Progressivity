# TASKS.md — План реализации

Задачи разбиты по фазам. Каждая фаза — логически завершённый этап, после которого можно проверить результат.

## Фаза 0: Инициализация проекта
- [x] Инициализировать Go-модуль (`go mod init`)
- [x] Создать структуру директорий (cmd, internal, migrations, pkg, web)
- [x] Настроить Docker Compose (PostgreSQL 18)
- [x] Создать Makefile с базовыми командами (build, run, migrate, test)
- [x] Инициализировать Vite + React + TypeScript проект в `web/`
- [x] Настроить Tailwind CSS и Radix UI
- [x] Настроить ESLint + Prettier для frontend
- [x] Создать .env.example с переменными окружения
- [x] Настроить пакет config (чтение env/файлов конфигурации)
- [x] Настроить структурированное логирование (slog)

## Фаза 1: База данных и миграции
- [x] Написать миграцию `000001_create_users` (up/down)
- [x] Написать миграцию `000002_create_tasks` (up/down) — с self-reference FK
- [x] Написать миграцию `000003_create_progress_entries` (up/down)
- [x] Настроить подключение к PostgreSQL (`infrastructure/postgres/connection.go`)
- [x] Добавить команду миграции в Makefile (`make migrate-up`, `make migrate-down`)
- [x] Проверить миграции: up -> down -> up без ошибок

## Фаза 2: Domain layer
- [x] Определить `User` entity (`internal/domain/user.go`)
- [x] Определить `Task` entity с полями для рекурсивной структуры (`internal/domain/task.go`)
- [x] Определить `ProgressEntry` entity (`internal/domain/task.go`)
- [x] Определить `TaskWithProgress` — расширенная структура с вычисляемыми полями
- [x] Определить доменные ошибки (`internal/domain/errors.go`)
- [x] Определить интерфейс `TaskRepository` (`internal/repository/task_repository.go`)
- [x] Определить интерфейс `ProgressEntryRepository` (`internal/repository/progress_entry.go`)
- [x] Определить интерфейс `UserRepository` (`internal/repository/user_repository.go`)

## Фаза 3: Infrastructure layer — репозитории
- [x] Реализовать `UserRepository` для PostgreSQL
  - [x] Create
  - [x] GetByID
  - [x] GetByEmail
  - [x] GetByUsername
- [x] Реализовать `TaskRepository` для PostgreSQL
  - [x] Create
  - [x] GetByID
  - [x] Update
  - [x] Delete (каскадное через FK)
  - [x] ListByParentID (дочерние задачи)
  - [x] ListRootByUserID (top-level задачи)
  - [x] GetTreeByID (рекурсивный запрос — CTE)
  - [x] UpdatePosition
- [x] Реализовать `ProgressEntryRepository`
  - [x] Create
  - [x] Delete
  - [x] ListByTaskID
  - [x] SumByTaskID

## Фаза 4: Auth (JWT)
- [x] Реализовать JWT-менеджер (`infrastructure/auth/jwt.go`)
  - [x] GenerateAccessToken
  - [x] GenerateRefreshToken
  - [x] ValidateAccessToken
  - [x] ValidateRefreshToken
- [x] Реализовать `AuthUsecase` (`usecase/auth_usecase.go`)
  - [x] Register (валидация, хеширование пароля, сохранение)
  - [x] Login (проверка credentials, генерация токенов)
  - [x] Refresh (валидация refresh token, генерация новой пары)
  - [x] Logout (инвалидация refresh token)
- [x] Реализовать Auth middleware (`delivery/http/middleware/auth_middleware.go`)
- [x] Реализовать Auth handler (`delivery/http/handler/auth_handler.go`)
- [x] Определить Auth DTO (`delivery/http/dto/auth_dto.go`)

## Фаза 5: Task Usecase
- [x] Реализовать `TaskUsecase` (`usecase/task_usecase.go`)
  - [x] CreateTask (top-level)
  - [x] CreateChildTask (с проверкой владельца родителя)
  - [x] GetTask (с расчётом прогресса)
  - [x] UpdateTask
  - [x] DeleteTask (проверка владельца)
  - [x] ListRootTasks
  - [x] ListChildren
  - [x] GetTree (рекурсивный расчёт прогресса)
  - [x] ReorderTask
- [x] Реализовать алгоритм рекурсивного расчёта прогресса
  - [x] Leaf + target_value: sum(entries) / target
  - [x] Leaf бинарная: 0% / 100%
  - [x] Container: avg(children)
  - [x] Комбо: completed_children / total_children + avg %
- [x] Реализовать `ProgressUsecase`
  - [x] AddProgress (проверка: только leaf-задачи)
  - [x] DeleteProgress
  - [x] ListProgress

## Фаза 6: HTTP Delivery layer
- [x] Определить Task DTO (`delivery/http/dto/task_dto.go`)
  - [x] CreateTaskRequest / CreateTaskResponse
  - [x] UpdateTaskRequest
  - [x] TaskResponse (с прогрессом)
  - [x] TaskTreeResponse (рекурсивный)
  - [x] ProgressEntryRequest / ProgressEntryResponse
- [x] Реализовать Task handler (`delivery/http/handler/task_handler.go`)
  - [x] GET    /tasks
  - [x] POST   /tasks
  - [x] GET    /tasks/:id
  - [x] PUT    /tasks/:id
  - [x] DELETE /tasks/:id
  - [x] GET    /tasks/:id/children
  - [x] POST   /tasks/:id/children
  - [x] GET    /tasks/:id/tree
  - [x] PATCH  /tasks/:id/reorder
  - [x] GET    /tasks/:id/progress
  - [x] POST   /tasks/:id/progress
  - [x] DELETE /progress/:id
- [x] Настроить роутер (`delivery/http/router.go`)
- [x] Подключить middleware (auth, CORS, logging, recovery)

## Фаза 7: Интеграция Backend
- [ ] Собрать всё в `cmd/api/main.go` (dependency injection)
- [ ] Добавить graceful shutdown
- [ ] Добавить CORS для frontend dev server
- [ ] Проверить все эндпоинты через curl / httpie / Postman
- [ ] Написать unit-тесты для usecase (мок репозиториев)
- [ ] Написать handler-тесты с httptest

## Фаза 8: Frontend на моках — типы и in-memory store
- [x] Определить TypeScript-типы (`web/src/types/`)
  - [x] User
  - [x] Task, TaskWithProgress, TaskStatus
  - [x] ProgressEntry
  - [x] CreateTaskRequest, UpdateTaskRequest, CreateProgressRequest
- [x] Реализовать in-memory mock store (`web/src/store/mock-store.ts`)
  - [x] Хранилище задач и progress entries (Map или массив)
  - [x] CRUD-операции: createTask, updateTask, deleteTask (каскадно)
  - [x] getTasksByParentId, getRootTasks, getTaskTree
  - [x] addProgress, deleteProgress, getProgressByTaskId
  - [x] Рекурсивный расчёт прогресса на клиенте
- [x] Заполнить mock store реалистичными seed-данными
  - [x] Цель "Прочитать 10 книг" с несколькими книгами и progress entries
  - [x] Цель "Пробежать 500 км" с месячными подзадачами
  - [x] Бинарная задача для проверки done/not done
- [x] React Context для mock store с реактивными обновлениями

## Фаза 9: Frontend на моках — UI компоненты
- [x] Настроить React Router (маршруты: dashboard, task/:id)
- [x] Создать layout с навигацией и заглушкой юзера
- [x] Прогресс-бар компонент (`ProgressBar`)
  - [x] Процент + полоска
  - [x] Комбинированный: "3/10 завершено, 35%"
  - [x] Цветовая индикация (зелёный при 100%, жёлтый в процессе)
- [x] Компонент карточки задачи (`TaskCard`)
  - [x] Title, description, status badge
  - [x] Progress bar или "done/not done"
  - [x] Unit info (если есть): "120 / 300 pages"
  - [x] Количество подзадач
- [x] Компонент дерева задач (`TaskTree`) — рекурсивный рендеринг
- [x] Модальное окно / форма создания задачи (`CreateTaskForm`)
  - [x] Title, description, unit, target_value, deadline
  - [x] Валидация полей
- [x] Модальное окно / форма редактирования задачи (`EditTaskForm`)
- [x] Диалог подтверждения удаления (`DeleteConfirmDialog`)
- [x] Форма добавления прогресса (`AddProgressForm`)
  - [x] Value, note, date (по умолчанию — сегодня)
- [x] Список записей прогресса (`ProgressHistory`)

## Фаза 10: Frontend на моках — страницы
- [x] Страница Dashboard
  - [x] Список top-level задач (карточки с прогресс-барами)
  - [x] Кнопка "Создать цель"
  - [x] Empty state: "Нет целей. Создайте первую!"
- [x] Страница задачи (`TaskPage`)
  - [x] Заголовок задачи с прогрессом
  - [x] Дерево подзадач (рекурсивное)
  - [x] Кнопка "Добавить подзадачу"
  - [x] Панель прогресса (для leaf-задач): форма + история
  - [x] Редактирование / удаление задачи
  - [x] Изменение статуса задачи
  - [x] Навигация: breadcrumbs (parent -> current)
- [x] Проверить полный flow на моках: создать цель -> подзадачи -> добавить прогресс -> видеть обновление

## Фаза 11: Frontend — интеграция с Backend API
- [ ] Настроить TanStack Query (QueryClientProvider)
- [ ] Создать API-клиент (`web/src/api/client.ts`) с interceptors для JWT
- [ ] Реализовать API-функции (`web/src/api/tasks.ts`, `web/src/api/auth.ts`, `web/src/api/progress.ts`)
- [ ] Заменить mock store на API hooks
  - [ ] useTasks, useTask, useTaskTree
  - [ ] useCreateTask, useUpdateTask, useDeleteTask
  - [ ] useProgress, useAddProgress, useDeleteProgress
- [ ] Feature flag / переключатель: моки ↔ реальный API (для разработки)

## Фаза 12: Frontend — Auth
- [ ] Страница регистрации
- [ ] Страница логина
- [ ] Auth context / store (хранение tokens, auto-refresh)
- [ ] Protected routes (редирект на логин если не авторизован)
- [ ] API hooks: useLogin, useRegister, useLogout

## Фаза 13: Полировка
- [ ] Адаптивный дизайн (мобильная версия)
- [ ] Loading states и скелетоны
- [ ] Error handling и toast-уведомления
- [ ] Empty states для всех списков
- [ ] Оптимистичные обновления (TanStack Query)
- [ ] Финальное тестирование E2E сценариев

---

## Приоритеты

- **P0 (Must Have)**: Фазы 0-7 (backend) + Фазы 8-10 (frontend на моках)
- **P1 (Should Have)**: Фазы 11-12 (интеграция с API, auth), Фаза 13 (полировка)
- **P2 (Nice to Have)**: Графики прогресса, дедлайн-индикаторы, пользовательские единицы, reorder
