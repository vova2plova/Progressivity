# Phase 3: VPS Configuration Runbook

## Summary

Этот runbook фиксирует подготовку чистого `Ubuntu 22.04` VPS для первого production-like деплоя Progressivity без домена и без TLS.

Цель фазы:

- подготовить сервер под `docker compose`
- ограничить внешний доступ до `SSH` и `HTTP`
- стандартизировать структуру деплоя
- выполнить первый запуск без догадок по шагам

Зафиксированные соглашения:

- deploy user: `progressivity`
- app dir: `/opt/progressivity`
- source delivery: `git clone` / `git pull`
- public entrypoint: только `caddy` на `:80`
- рабочий каталог для deploy-команд: `/opt/progressivity`
- production env file хранится на сервере и не коммитится в репозиторий

## Prerequisites

Нужно заранее подготовить:

- публичный IP VPS
- SSH-ключ на локальной машине
- доступ к существующему sudo-пользователю или root на VPS
- URL git-репозитория проекта
- значения для production secrets:
  - `DB_PASSWORD`
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`

Проверить локально наличие SSH-ключа:

```bash
ls -la ~/.ssh
```

Если ключа ещё нет, создать его локально:

```bash
ssh-keygen -t ed25519 -C "progressivity-deploy"
```

## 1. Connect to the Clean VPS

Подключиться к серверу под исходным sudo-пользователем или `root`:

```bash
ssh root@<VPS_IP>
```

Если root login уже запрещён, использовать выданного sudo-пользователя:

```bash
ssh <INITIAL_SUDO_USER>@<VPS_IP>
```

Обновить индексы пакетов и базовые пакеты:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg lsb-release git ufw
```

## 2. Create the Deploy User

Создать отдельного пользователя для деплоя:

```bash
sudo adduser --disabled-password --gecos "" progressivity
sudo usermod -aG sudo progressivity
```

Создать каталог для SSH-ключей и выставить права:

```bash
sudo mkdir -p /home/progressivity/.ssh
sudo chmod 700 /home/progressivity/.ssh
sudo chown -R progressivity:progressivity /home/progressivity/.ssh
```

С локальной машины скопировать публичный ключ:

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub progressivity@<VPS_IP>
```

Если `ssh-copy-id` недоступен, добавить ключ вручную:

```bash
cat ~/.ssh/id_ed25519.pub
```

Затем на VPS вставить его в файл:

```bash
sudo -u progressivity tee -a /home/progressivity/.ssh/authorized_keys >/dev/null
sudo chmod 600 /home/progressivity/.ssh/authorized_keys
sudo chown progressivity:progressivity /home/progressivity/.ssh/authorized_keys
```

Проверить вход под deploy-пользователем в отдельной локальной сессии:

```bash
ssh progressivity@<VPS_IP>
```

## 3. Harden SSH

Открыть конфиг SSH:

```bash
sudo nano /etc/ssh/sshd_config
```

Убедиться, что в конфиге заданы или раскомментированы эти значения:

```text
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
PermitRootLogin no
UsePAM yes
```

Проверить конфиг и перезапустить SSH:

```bash
sudo sshd -t
sudo systemctl restart ssh
```

Не закрывать текущую сессию, пока не подтверждён новый вход:

```bash
ssh progressivity@<VPS_IP>
```

Критерий успеха:

- вход по ключу работает
- вход по паролю не работает
- root login отключён

## 4. Install Docker Engine and Docker Compose Plugin

Удалить старые конфликтующие пакеты, если они есть:

```bash
sudo apt remove -y docker docker-engine docker.io containerd runc
```

Добавить официальный Docker apt repository:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt update
```

Установить Docker Engine и Compose plugin:

```bash
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Дать deploy-пользователю доступ к Docker без `sudo`:

```bash
sudo usermod -aG docker progressivity
```

Перелогиниться под `progressivity` и проверить:

```bash
docker --version
docker compose version
docker info
```

## 5. Configure Firewall

Разрешить только SSH и HTTP:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw --force enable
sudo ufw status
```

Ожидаемый результат:

- разрешён `OpenSSH`
- разрешён `80/tcp`
- другие входящие порты не открыты

## 6. Prepare the Application Directory

Создать стандартный каталог приложения:

```bash
sudo mkdir -p /opt/progressivity
sudo chown -R progressivity:progressivity /opt/progressivity
```

Проверить права:

```bash
ls -ld /opt/progressivity
```

Ожидается владелец `progressivity`.

## 7. Deliver the Source Code

Войти под deploy-пользователем и перейти в рабочий каталог:

```bash
sudo -iu progressivity
cd /opt
```

Склонировать проект:

```bash
git clone <REPO_URL> progressivity
cd /opt/progressivity
```

Проверить наличие production artifacts:

```bash
ls
test -f docker-compose.prod.yml
test -f Dockerfile
test -f web/Dockerfile
test -f migrations/000001_create_users.up.sql
```

Для последующих обновлений использовать:

```bash
cd /opt/progressivity
git pull --ff-only
```

## 8. Create the Server-Side Production Env File

На сервере не использовать `.env.example` как готовый production-файл с dev-значениями.

В репозитории для этой фазы добавлен шаблон `/.env.production.example`. На VPS нужно создать настоящий `.env` рядом с `docker-compose.prod.yml`:

```bash
cd /opt/progressivity
cp .env.production.example .env
chmod 600 .env
```

Открыть файл:

```bash
nano /opt/progressivity/.env
```

Заполнить:

```dotenv
SERVER_PORT=8080
CORS_ALLOWED_ORIGINS=

DB_USER=progressivity
DB_PASSWORD=<STRONG_DB_PASSWORD>
DB_NAME=progressivity
DB_SSLMODE=disable

JWT_ACCESS_SECRET=<LONG_RANDOM_ACCESS_SECRET>
JWT_REFRESH_SECRET=<LONG_RANDOM_REFRESH_SECRET>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=720h

LOG_LEVEL=info
```

Заметки по значениям:

- `DB_PORT` в `.env` не нужен для production compose, потому что внутри сети уже зафиксирован `5432`
- `DB_SSLMODE=disable` подходит для текущей контейнерной схемы внутри одной docker-сети
- `CORS_ALLOWED_ORIGINS` можно оставить пустым для same-origin схемы через `caddy`
- `JWT_ACCESS_SECRET` и `JWT_REFRESH_SECRET` должны быть длинными случайными строками

Примеры генерации секретов на VPS:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

## 9. Preflight Checks Before the First Start

Перед запуском убедиться:

- текущий каталог: `/opt/progressivity`
- заполнен `/opt/progressivity/.env`
- deploy user входит в группу `docker`
- firewall уже активен
- порт `80` не занят сторонним сервисом

Команды проверки:

```bash
cd /opt/progressivity
id
docker compose -f docker-compose.prod.yml config >/tmp/progressivity-compose-rendered.yml
docker compose -f docker-compose.prod.yml config --services
sudo ss -ltnp | grep ':80'
```

Если `grep ':80'` ничего не выводит, порт свободен.

## 10. First Start on the VPS

Все команды ниже выполнять из `/opt/progressivity`.

Примечание по PostgreSQL 18:

- в `docker-compose.prod.yml` volume должен монтироваться в `/var/lib/postgresql`, а не в `/var/lib/postgresql/data`
- это требуется из-за нового layout данных в официальном образе `postgres:18`

Сначала поднять базу:

```bash
docker compose -f docker-compose.prod.yml up -d postgres
```

Убедиться, что PostgreSQL healthy:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs postgres --tail=50
```

Применить миграции отдельным one-shot контейнером:

```bash
docker compose -f docker-compose.prod.yml run --rm migrate up
```

Поднять backend и public entrypoint:

```bash
docker compose -f docker-compose.prod.yml up -d backend caddy
```

Проверить состояние:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs backend --tail=100
docker compose -f docker-compose.prod.yml logs caddy --tail=100
```

## 11. Smoke Checks

Проверить API health:

```bash
curl -i http://127.0.0.1/api/v1/health
curl -i http://<VPS_IP>/api/v1/health
```

Проверить frontend:

```bash
curl -I http://127.0.0.1/
curl -I http://<VPS_IP>/
```

Критерии успеха:

- `docker compose ps` показывает поднятые `postgres`, `backend`, `caddy`
- `GET /api/v1/health` отвечает `200`
- главная страница открывается по `http://<VPS_IP>/`

## 12. Daily Operations for the Next Phases

Базовые команды сопровождения:

```bash
cd /opt/progressivity
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs backend --tail=100
docker compose -f docker-compose.prod.yml logs caddy --tail=100
docker compose -f docker-compose.prod.yml logs postgres --tail=100
docker compose -f docker-compose.prod.yml restart backend
```

Обновление кода для следующих фаз:

```bash
cd /opt/progressivity
git pull --ff-only
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d backend caddy
```

Если в обновлении есть миграции:

```bash
docker compose -f docker-compose.prod.yml run --rm migrate up
```

## Acceptance Checklist

- deploy user `progressivity` создан и может использовать `docker`
- SSH по ключу работает, вход по паролю отключён
- `docker compose version` доступен deploy-пользователю
- `ufw status` показывает только `OpenSSH` и `80/tcp`
- проект лежит в `/opt/progressivity`
- production `.env` создан на сервере и не закоммичен
- `http://<VPS_IP>/` отвечает
- `http://<VPS_IP>/api/v1/health` отвечает

## Phase 4 Dependency Notes

Фаза 4 должна опираться на следующие артефакты и соглашения:

- рабочий каталог VPS: `/opt/progressivity`
- server-side env file: `/opt/progressivity/.env`
- все production команды запускаются из `/opt/progressivity`
- preflight перед первым деплоем:
  - `docker compose ... config`
  - проверка группы `docker`
  - проверка занятости `:80`
  - проверка заполненного `.env`
