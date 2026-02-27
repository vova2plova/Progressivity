# PRD — Product Requirements Document

## Progressivity: Таск-трекер с отслеживанием прогресса

### 1. Видение продукта

Progressivity — приложение для отслеживания целей и задач с измеримым прогрессом. В отличие от обычных TODO-листов, Progressivity позволяет декомпозировать цели на подзадачи любой глубины вложенности, задавать количественные метрики (страницы, километры, часы) и визуально отслеживать прогресс на каждом уровне иерархии.

### 2. Целевая аудитория

- Люди, ставящие долгосрочные цели (прочитать N книг, пробежать M км за год)
- Студенты, отслеживающие прогресс по учебным программам
- Любой, кому нужен более гранулярный контроль прогресса, чем просто чеклист

### 3. Ключевые сценарии использования

#### Сценарий 1: Чтение книг
```
Цель: "Прочитать 10 книг за 2026 год"
  └── Книга: "Рыцарь семи королевств" (300 страниц)
      ├── +50 страниц (15 января)
      ├── +30 страниц (17 января)
      └── +20 страниц (20 января)
      → Прогресс: 100/300 = 33%

Общий прогресс цели:
  — Завершено: 1 из 10 книг
  — Средний прогресс: 19.3%
```

#### Сценарий 2: Спортивная цель
```
Цель: "Пробежать 1000 км за год"
  └── Январь (target: 80 км)
      ├── +5 км (3 янв)
      ├── +10 км (5 янв)
      └── ...
```

#### Сценарий 3: Учебная программа
```
Цель: "Освоить Go"
  ├── Курс на Udemy (unit: hours, target: 40)
  ├── Книга "The Go Programming Language" (unit: pages, target: 380)
  └── Pet-project (бинарная задача — done/not done)
```

### 4. Функциональные требования

#### 4.1 Аутентификация
| ID | Требование | Приоритет |
|----|-----------|-----------|
| AUTH-1 | Регистрация по email + пароль | P0 |
| AUTH-2 | Логин с выдачей JWT (access + refresh tokens) | P0 |
| AUTH-3 | Обновление access token через refresh token | P0 |
| AUTH-4 | Логаут (инвалидация refresh token) | P0 |
| AUTH-5 | Валидация email (формат, уникальность) | P0 |
| AUTH-6 | Хеширование паролей (bcrypt) | P0 |

#### 4.2 Управление задачами
| ID | Требование | Приоритет |
|----|-----------|-----------|
| TASK-1 | Создание top-level задачи (Goal) | P0 |
| TASK-2 | Создание дочерней задачи на любом уровне вложенности | P0 |
| TASK-3 | Редактирование задачи (title, description, unit, target_value, deadline) | P0 |
| TASK-4 | Удаление задачи с каскадным удалением детей и progress entries | P0 |
| TASK-5 | Просмотр списка top-level задач | P0 |
| TASK-6 | Просмотр дочерних задач | P0 |
| TASK-7 | Просмотр полного дерева задачи с прогрессом | P0 |
| TASK-8 | Изменение статуса задачи (not_started, in_progress, completed, archived) | P0 |
| TASK-9 | Изменение порядка задач (position) среди siblings | P1 |
| TASK-10 | Фильтрация задач по статусу | P1 |
| TASK-11 | Задание target_count для контейнерных задач | P1 |
| TASK-12 | Дедлайны с визуальным индикатором просрочки | P2 |

#### 4.3 Отслеживание прогресса
| ID | Требование | Приоритет |
|----|-----------|-----------|
| PROG-1 | Добавление записи прогресса (value + опциональная заметка) | P0 |
| PROG-2 | Просмотр истории прогресса по задаче | P0 |
| PROG-3 | Удаление записи прогресса | P0 |
| PROG-4 | Автоматический расчёт прогресса leaf-задачи: sum(entries) / target_value | P0 |
| PROG-5 | Рекурсивный расчёт прогресса контейнера: avg(children.progress) | P0 |
| PROG-6 | Отображение комбинированного прогресса: "X/Y завершено" + "Z% общий прогресс" | P0 |
| PROG-7 | Поддержка бинарных задач (done/not done, без target_value) | P0 |
| PROG-8 | Указание даты записи (recorded_at), отличной от текущей | P1 |
| PROG-9 | График прогресса во времени | P2 |

#### 4.4 Единицы измерения
| ID | Требование | Приоритет |
|----|-----------|-----------|
| UNIT-1 | Предустановленные единицы: pages, km, hours, items | P0 |
| UNIT-2 | Пользовательские единицы (произвольная строка) | P1 |

### 5. Нефункциональные требования

| Категория | Требование |
|-----------|-----------|
| Производительность | Расчёт дерева с прогрессом до 100 задач < 200ms |
| Безопасность | Пароли хешируются bcrypt, JWT подписывается HS256/RS256 |
| Безопасность | Пользователь видит только свои задачи (row-level isolation) |
| Надёжность | Каскадное удаление через FK constraints в PostgreSQL |
| Удобство | Адаптивный интерфейс (mobile-friendly) |
| Развёртывание | Docker Compose для локальной разработки |

### 6. Доменная модель

#### 6.1 Сущности

**User**
```
id            UUID (PK)
email         string, unique, not null
username      string, unique, not null
password_hash string, not null
created_at    timestamptz
updated_at    timestamptz
```

**Task** (единая рекурсивная сущность)
```
id            UUID (PK)
parent_id     UUID (FK -> Task, nullable)   — NULL = top-level ("Goal")
user_id       UUID (FK -> User, not null)
title         string, not null
description   text (nullable)
unit          string (nullable)              — "pages" / "km" / "hours" / "items"
target_value  decimal (nullable)             — NULL для контейнеров и бинарных задач
target_count  integer (nullable)             — ожидаемое число завершённых подзадач
deadline      timestamptz (nullable)
position      integer, not null, default 0
status        string, not null               — not_started / in_progress / completed / archived
created_at    timestamptz
updated_at    timestamptz
```

**ProgressEntry**
```
id            UUID (PK)
task_id       UUID (FK -> Task, not null)
value         decimal, not null              — инкрементальная прибавка
note          text (nullable)
recorded_at   timestamptz, not null
created_at    timestamptz
```

#### 6.2 Правила домена

1. ProgressEntry можно добавить только к leaf-задаче (без дочерних задач).
2. Leaf-задача с `target_value`: прогресс = `sum(entries.value) / target_value`.
3. Leaf-задача без `target_value` (бинарная): прогресс = 0% или 100% (по `status`).
4. Контейнерная задача: прогресс = `avg(children.progress)`.
5. Задача принадлежит одному пользователю. Дочерняя задача наследует `user_id` родителя.
6. При удалении задачи каскадно удаляются все дочерние задачи и связанные progress entries.
7. `value` в ProgressEntry — инкрементальная прибавка, не абсолютное значение.

#### 6.3 Алгоритм расчёта прогресса

```
calculateProgress(task):
  if task has no children:
    if task.target_value != NULL:
      current = sum(progress_entries.value)
      return clamp(current / target_value, 0, 1.0)
    else:
      return 1.0 if task.status == completed else 0.0

  else:  // контейнер
    children_progress = [calculateProgress(child) for child in children]
    return avg(children_progress)
```

Для контейнеров дополнительно вычисляется:
- `completed_children` — количество дочерних задач со статусом `completed`
- `total_children` — общее количество прямых дочерних задач

### 7. REST API

Все эндпоинты с префиксом `/api/v1`. Защищённые эндпоинты требуют заголовок `Authorization: Bearer <access_token>`.

#### 7.1 Auth (публичные)
```
POST   /api/v1/auth/register     — регистрация
POST   /api/v1/auth/login        — логин, возвращает access + refresh tokens
POST   /api/v1/auth/refresh      — обновление access token
POST   /api/v1/auth/logout       — инвалидация refresh token
```

#### 7.2 Tasks (защищённые)
```
GET    /api/v1/tasks              — top-level задачи пользователя
POST   /api/v1/tasks              — создать top-level задачу
GET    /api/v1/tasks/:id          — задача с вычисленным прогрессом
PUT    /api/v1/tasks/:id          — обновить задачу
DELETE /api/v1/tasks/:id          — удалить задачу (каскадно)
GET    /api/v1/tasks/:id/children — прямые дочерние задачи
POST   /api/v1/tasks/:id/children — создать дочернюю задачу
GET    /api/v1/tasks/:id/tree     — полное дерево с прогрессом
PATCH  /api/v1/tasks/:id/reorder  — изменить позицию
```

#### 7.3 Progress (защищённые)
```
GET    /api/v1/tasks/:id/progress — история прогресса задачи
POST   /api/v1/tasks/:id/progress — добавить запись прогресса
DELETE /api/v1/progress/:id       — удалить запись прогресса
```

### 8. Технологический стек

| Слой | Технология |
|------|-----------|
| Backend | Go, net/http или chi |
| База данных | PostgreSQL 18 |
| Миграции | golang-migrate |
| Аутентификация | JWT (access + refresh tokens) |
| Frontend | React 19, TypeScript, Vite |
| UI-компоненты | Radix UI |
| Стилизация | Tailwind CSS |
| Серверный стейт | TanStack Query |
| Контейнеризация | Docker, Docker Compose |

### 9. Ограничения и допущения

- MVP рассчитан на одного пользователя (но с архитектурой под многопользовательский режим с JWT).
- Максимальная глубина вложенности задач не ограничена, но UI оптимизирован для 3-4 уровней.
- Расчёт прогресса выполняется на лету (не кешируется), допустимо для деревьев до 100 задач.
- Файловые вложения не поддерживаются в MVP.

### 10. Метрики успеха

- Пользователь может создать цель с подзадачами и увидеть прогресс за < 5 кликов.
- Расчёт дерева прогресса для 100 задач < 200ms.
- Прогресс-бар обновляется мгновенно после добавления записи.
