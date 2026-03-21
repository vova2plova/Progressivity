# Стиль кода и соглашения

## Go (Backend)

### Общие принципы
- Следуем стандартным Go-конвенциям (Effective Go)
- Используем `golangci-lint` с настроенным набором линтеров (см. `.golangci.yml`)
- Именование: camelCase для приватных идентификаторов, PascalCase для публичных
- Длина строк: 140 символов (настройка lll в golangci-lint)
- Комментарии: на английском языке, начинаются с имени сущности
- Обработка ошибок: всегда проверяем ошибки, не игнорируем

### Структура кода
- Clean Architecture: зависимости направлены внутрь (domain → usecase → delivery)
- Domain-сущности не содержат бизнес-логики
- Usecase содержит всю бизнес-логику, работает только с интерфейсами репозиториев
- Handlers только парсят запросы, вызывают usecase, формируют ответы
- Репозитории реализуются в infrastructure с использованием SQL

### Форматирование
- Используем `gofmt` и `goimports` автоматически через golangci-lint
- Интерфейсы: `any` вместо `interface{}`
- Импорты группируются: стандартная библиотека, внешние зависимости, внутренние пакеты
- Теги структур: `db:"field_name"` для полей, соответствующих колонкам БД

### Тестирование
- Unit-тесты для usecase с моками репозиториев
- Integration-тесты для repository с тестовой БД
- Handler-тесты с httptest
- Имена тестов: `TestUsecase_CreateTask`, `TestRepository_GetByID`

## TypeScript/React (Frontend)

### Общие принципы
- Строгая типизация TypeScript, избегаем `any`
- Функциональные компоненты с хуками
- ESLint с правилами React Hooks, TypeScript и Prettier
- Prettier конфигурация: одинарные кавычки, без точек с запятой, trailing commas

### Форматирование
```typescript
// Пример стиля
const MyComponent = ({ title, children }: MyProps) => {
  const [state, setState] = useState('')

  useEffect(() => {
    // эффект
  }, [])

  return (
    <div className="container">
      <h1>{title}</h1>
      {children}
    </div>
  )
}
```

### Структура проекта
- `components/` — переиспользуемые UI компоненты
- `pages/` — страницы приложения (композиция компонентов)
- `api/` — клиенты API и хуки TanStack Query
- `hooks/` — кастомные React хуки
- `store/` — контексты и состояние (включая mock store)
- `types/` — TypeScript типы и интерфейсы

### Соглашения по именованию
- Компоненты: PascalCase (`TaskCard`, `ProgressBar`)
- Файлы компонентов: `PascalCase.tsx`
- Хуки: `useCamelCase` (`useTasks`, `useAuth`)
- Функции: camelCase
- Константы: UPPER_SNAKE_CASE или PascalCase для React компонентов
- Типы: PascalCase (`Task`, `ProgressEntry`)

### API взаимодействие
- Используем TanStack Query для server state
- Axios для HTTP запросов
- JWT токены хранятся в памяти, refresh через interceptor
- Все API вызовы через отдельные хуки

## База данных
- PostgreSQL 18
- UUID первичные ключи
- Все таблицы с `created_at`, `updated_at` (timestamptz)
- Каскадное удаление для дочерних задач и progress entries
- Миграции через golang-migrate с нумерацией `000001_name.up.sql`

## Git
- Коммиты на английском языке
- Сообщения коммитов в повелительном наклонении: "Add auth middleware", "Fix progress calculation"
- Перед коммитом запускать `make check` и `npm run lint`