# Phase 1: VPS Deployment Blueprint

## Summary

Фаза 1 фиксирует production-like схему первого деплоя на один VPS без домена и без HTTPS.
Цель этапа — согласовать topology, runtime assumptions и список обязательных production-конфигов до упаковки в production-контейнеры.

## Target Architecture

- `caddy` принимает внешний HTTP-трафик на `:80`
- `caddy` отдаёт frontend как статические файлы
- `caddy` проксирует `/api/*` на backend внутри docker-сети
- backend работает в отдельном контейнере и слушает внутренний порт `8080`
- PostgreSQL работает в отдельном контейнере
- backend и PostgreSQL не публикуют порты наружу
- данные PostgreSQL хранятся в persistent volume
- все сервисы соединены внутренней docker-сетью

Сетевая модель:

- UI: `http://<VPS_IP>/`
- API: `http://<VPS_IP>/api/v1/...`
- наружу публикуется только reverse proxy

## Runtime Decisions

- Целевая production-стратегия запуска: `docker compose -f docker-compose.prod.yml up -d`
- Reverse proxy для первой production-схемы: `Caddy`
- Restart policy для production-сервисов: `unless-stopped`
- Миграции не встраиваются в startup backend и должны запускаться отдельной явной командой или one-shot container
- Первый production-like деплой выполняется по IP-адресу VPS, без домена и без TLS

## Backend Configuration

Фактически читаемые backend-переменные окружения:

- `SERVER_PORT`
- `CORS_ALLOWED_ORIGINS`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_SSLMODE`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_TTL`
- `JWT_REFRESH_TTL`
- `LOG_LEVEL`

Production-обязательные переменные:

- `SERVER_PORT`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_SSLMODE`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_TTL`
- `JWT_REFRESH_TTL`

Дополнения:

- `CORS_ALLOWED_ORIGINS` остаётся поддерживаемой переменной, но для same-origin схемы через `Caddy` не является обязательной
- пустые значения `JWT_ACCESS_SECRET` и `JWT_REFRESH_SECRET` допустимы в коде только как fallback разработки и недопустимы в production
- отдельный `SERVER_HOST` не нужен: backend уже слушает `:<SERVER_PORT>`, что подходит для контейнерного запуска
- readiness/health probe можно строить на `GET /api/v1/health`

## Frontend Configuration

- Frontend уже использует относительный `baseURL: '/api/v1'`
- Это поведение считается целевым для production
- Отдельный `VITE_API_URL` для первой VPS-схемы не нужен
- Proxy в Vite нужен только для локальной разработки, где frontend работает на `http://localhost:5173`, а backend на `http://localhost:8080`

## Auth and Traffic Assumptions

- Текущий auth flow работает через bearer tokens в заголовке `Authorization`
- Для первой production-версии не требуются cookie-настройки, secure-cookie политика или отдельная cross-site схема
- Same-origin topology через reverse proxy снижает риск CORS-проблем на первом VPS-деплое

## Minimum VPS Requirements

Baseline для первого preview/deploy:

- `1 vCPU`
- `2 GB RAM`
- `20 GB SSD`

Рекомендованный запас для более спокойной эксплуатации:

- `2 vCPU`
- `4 GB RAM`
- `40 GB SSD`

Системные требования:

- современный Linux LTS
- установленный Docker Engine
- установленный Docker Compose plugin

## Validation Notes

Проверки, на которых основана эта фиксация:

- backend стартует с адресом вида `:<SERVER_PORT>` и не зависит от отдельного host binding
- frontend production build не требует runtime API URL и использует относительные `/api/v1`
- в backend уже есть endpoint `GET /api/v1/health`
- `CORS_ALLOWED_ORIGINS` читается конфигом, но отсутствовал в `.env.example`, поэтому добавлен в документацию примера окружения
