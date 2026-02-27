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
- [ ] Написать миграцию `000001_create_users` (up/down)
- [ ] Написать миграцию `000002_create_tasks` (up/down) — с self-reference FK
- [ ] Написать миграцию `000003_create_progress_entries` (up/down)
- [ ] Настроить подключение к PostgreSQL (`infrastructure/postgres/connection.go`)
- [ ] Добавить команду миграции в Makefile (`make migrate-up`, `make migrate-down`)
- [ ] Проверить миграции: up -> down -> up без ошибок

## Фаза 2: Domain layer
- [ ] Определить `User` entity (`internal/domain/user.go`)
- [ ] Определить `Task` entity с полями для рекурсивной структуры (`internal/domain/task.go`)
- [ ] Определить `ProgressEntry` entity (`internal/domain/task.go`)
- [ ] Определить `TaskWithProgress` — расширенная структура с вычисляемыми полями
- [ ] Определить доменные ошибки (`internal/domain/errors.go`)
- [ ] Определить интерфейс `TaskRepository` (`internal/repository/task_repository.go`)
- [ ] Определить интерфейс `UserRepository` (`internal/repository/user_repository.go`)

## Фаза 3: Infrastructure layer — репозитории
- [ ] Реализовать `UserRepository` для PostgreSQL
  - [ ] Create
  - [ ] GetByID
  - [ ] GetByEmail
  - [ ] GetByUsername
- [ ] Реализовать `TaskRepository` для PostgreSQL
  - [ ] Create
  - [ ] GetByID
  - [ ] Update
  - [ ] Delete (каскадное через FK)
  - [ ] ListByParentID (дочерние задачи)
  - [ ] ListRootByUserID (top-level задачи)
  - [ ] GetTreeByID (рекурсивный запрос — CTE)
  - [ ] UpdatePosition
- [ ] Реализовать `ProgressEntryRepository`
  - [ ] Create
  - [ ] Delete
  - [ ] ListByTaskID
  - [ ] SumByTaskID

## Фаза 4: Auth (JWT)
- [ ] Реализовать JWT-менеджер (`infrastructure/auth/jwt.go`)
  - [ ] GenerateAccessToken
  - [ ] GenerateRefreshToken
  - [ ] ValidateAccessToken
  - [ ] ValidateRefreshToken
- [ ] Реализовать `AuthUsecase` (`usecase/auth_usecase.go`)
  - [ ] Register (валидация, хеширование пароля, сохранение)
  - [ ] Login (проверка credentials, генерация токенов)
  - [ ] Refresh (валидация refresh token, генерация новой пары)
  - [ ] Logout (инвалидация refresh token)
- [ ] Реализовать Auth middleware (`delivery/http/middleware/auth_middleware.go`)
- [ ] Реализовать Auth handler (`delivery/http/handler/auth_handler.go`)
- [ ] Определить Auth DTO (`delivery/http/dto/auth_dto.go`)

## Фаза 5: Task Usecase
- [ ] Реализовать `TaskUsecase` (`usecase/task_usecase.go`)
  - [ ] CreateTask (top-level)
  - [ ] CreateChildTask (с проверкой владельца родителя)
  - [ ] GetTask (с расчётом прогресса)
  - [ ] UpdateTask
  - [ ] DeleteTask (проверка владельца)
  - [ ] ListRootTasks
  - [ ] ListChildren
  - [ ] GetTree (рекурсивный расчёт прогресса)
  - [ ] ReorderTask
- [ ] Реализовать алгоритм рекурсивного расчёта прогресса
  - [ ] Leaf + target_value: sum(entries) / target
  - [ ] Leaf бинарная: 0% / 100%
  - [ ] Container: avg(children)
  - [ ] Комбо: completed_children / total_children + avg %
- [ ] Реализовать `ProgressUsecase`
  - [ ] AddProgress (проверка: только leaf-задачи)
  - [ ] DeleteProgress
  - [ ] ListProgress

## Фаза 6: HTTP Delivery layer
- [ ] Определить Task DTO (`delivery/http/dto/task_dto.go`)
  - [ ] CreateTaskRequest / CreateTaskResponse
  - [ ] UpdateTaskRequest
  - [ ] TaskResponse (с прогрессом)
  - [ ] TaskTreeResponse (рекурсивный)
  - [ ] ProgressEntryRequest / ProgressEntryResponse
- [ ] Реализовать Task handler (`delivery/http/handler/task_handler.go`)
  - [ ] GET    /tasks
  - [ ] POST   /tasks
  - [ ] GET    /tasks/:id
  - [ ] PUT    /tasks/:id
  - [ ] DELETE /tasks/:id
  - [ ] GET    /tasks/:id/children
  - [ ] POST   /tasks/:id/children
  - [ ] GET    /tasks/:id/tree
  - [ ] PATCH  /tasks/:id/reorder
  - [ ] GET    /tasks/:id/progress
  - [ ] POST   /tasks/:id/progress
  - [ ] DELETE /progress/:id
- [ ] Настроить роутер (`delivery/http/router.go`)
- [ ] Подключить middleware (auth, CORS, logging, recovery)

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
