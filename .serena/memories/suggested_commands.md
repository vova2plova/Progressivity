# Команды для разработки Progressivity

## Общие команды
```bash
# Запуск всей инфраструктуры (PostgreSQL)
make docker-up

# Остановка инфраструктуры
make docker-down

# Полный сброс БД (удаление томов)
make docker-reset

# Установка всех зависимостей и настройка окружения
make setup
```

## Backend (Go)
```bash
# Сборка приложения (с предварительным vet)
make build

# Запуск приложения в dev-режиме
make run

# Запуск всех тестов
make test

# Проверка кода линтерами (vet + golangci-lint)
make lint

# Комплексная проверка (vet + lint + test)
make check

# Применение миграций
make migrate-up

# Откат последней миграции
make migrate-down

# Удаление всей схемы БД (осторожно!)
make migrate-drop

# Создание новой миграции (интерактивно)
make migrate-create

# Очистка артефактов сборки
make clean
```

## Frontend (React/TypeScript)
```bash
# Перейти в директорию фронтенда
cd web

# Установка зависимостей
npm install

# Запуск dev-сервера (http://localhost:5173)
npm run dev

# Сборка для production
npm run build

# Запуск линтера
npm run lint

# Автоматическое исправление ошибок линтера
npm run lint:fix

# Форматирование кода с помощью Prettier
npm run format

# Предпросмотр production сборки
npm run preview
```

## Интеграционные команды
```bash
# Запуск БД и бэкенда (одной командой)
make dev

# Применение миграций и запуск фронтенда
make setup && cd web && npm run dev
```

## Тестирование
```bash
# Запуск всех Go-тестов с детальным выводом
go test ./... -v

# Запуск конкретного тестового пакета
go test ./internal/usecase -v

# Запуск тестов с покрытием
go test ./... -coverprofile=coverage.out && go tool cover -html=coverage.out

# Запуск линтера golangci-lint вручную
golangci-lint run ./...
```

## Работа с базой данных
```bash
# Подключение к PostgreSQL через psql (требуется установленный psql)
psql postgres://postgres:postgres@localhost:5432/progressivity?sslmode=disable

# Просмотр применённых миграций
migrate -path migrations -database "postgres://postgres:postgres@localhost:5432/progressivity?sslmode=disable" version
```

## Git workflow
```bash
# Проверить код перед коммитом
make check && cd web && npm run lint

# Форматирование всего кода
make lint && cd web && npm run format
```