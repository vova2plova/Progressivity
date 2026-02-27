# TASKS.md — План реализации

Задачи разбиты по фазам. Каждая фаза — логически завершённый этап, после которого можно проверить результат.

## Фаза 0: Инициализация проекта
- [ ] Инициализировать Go-модуль (`go mod init`)
- [ ] Создать структуру директорий (cmd, internal, migrations, pkg, web)
- [ ] Настроить Docker Compose (PostgreSQL 18)
- [ ] Создать Makefile с базовыми командами (build, run, migrate, test)
- [ ] Инициализировать Vite + React + TypeScript проект в `web/`
- [ ] Настроить Tailwind CSS и Radix UI
- [ ] Настроить ESLint + Prettier для frontend
- [ ] Создать .env.example с переменными окружения
- [ ] Настроить пакет config (чтение env/файлов конфигурации)
- [ ] Настроить структурированное логирование (slog)

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

## Фаза 8: Frontend — Базовая инфраструктура
- [ ] Настроить TanStack Query (QueryClientProvider)
- [ ] Создать API-клиент (`web/src/api/client.ts`) с interceptors для JWT
- [ ] Создать типы TypeScript (`web/src/types/`)
  - [ ] User
  - [ ] Task, TaskWithProgress
  - [ ] ProgressEntry
  - [ ] API request/response types
- [ ] Настроить React Router (маршруты: login, register, dashboard, task/:id)
- [ ] Создать layout с навигацией

## Фаза 9: Frontend — Auth
- [ ] Страница регистрации
- [ ] Страница логина
- [ ] Auth context / store (хранение tokens, auto-refresh)
- [ ] Protected routes (редирект на логин если не авторизован)
- [ ] API hooks: useLogin, useRegister, useLogout

## Фаза 10: Frontend — Tasks
- [ ] Страница Dashboard — список top-level задач с прогресс-барами
- [ ] Форма создания задачи (модальное окно или inline)
- [ ] Страница задачи — дерево подзадач с прогрессом
- [ ] Компонент карточки задачи (title, progress bar, status, unit info)
- [ ] Компонент дерева задач (рекурсивный рендеринг)
- [ ] Создание дочерней задачи
- [ ] Редактирование задачи (inline или модальное окно)
- [ ] Удаление задачи с подтверждением
- [ ] Изменение статуса задачи
- [ ] API hooks: useTasks, useTask, useTaskTree, useCreateTask, useUpdateTask, useDeleteTask

## Фаза 11: Frontend — Progress
- [ ] Форма добавления прогресса (value + note + date)
- [ ] История прогресса по задаче (список записей)
- [ ] Удаление записи прогресса
- [ ] Прогресс-бар компонент (с процентами и "X/Y" текстом)
- [ ] Комбинированное отображение прогресса контейнера: "3/10 завершено, 35%"
- [ ] API hooks: useProgress, useAddProgress, useDeleteProgress

## Фаза 12: Полировка
- [ ] Адаптивный дизайн (мобильная версия)
- [ ] Loading states и скелетоны
- [ ] Error handling и toast-уведомления
- [ ] Empty states ("Нет задач, создайте первую!")
- [ ] Оптимистичные обновления (TanStack Query)
- [ ] Финальное тестирование E2E сценариев

---

## Приоритеты

- **P0 (Must Have)**: Фазы 0-7 (backend) + Фазы 8-11 (frontend core)
- **P1 (Should Have)**: Фаза 12 (полировка), reorder, фильтрация
- **P2 (Nice to Have)**: Графики прогресса, дедлайн-индикаторы, пользовательские единицы
