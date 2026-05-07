# Development Setup

## Requirements

- Docker Desktop
- WSL2 enabled (Windows)

---

# Included Technologies

- PHP 8.4
- Laravel
- Node.js / NPM
- Redis
- FFmpeg
- Docker Compose

---

# Docker Structure

```txt
docker/
└── php/
    └── Dockerfile
```

---

# Build Containers

From the project root:

```bash
docker compose build
```

---

# Start Services

```bash
docker compose up -d
```

---

# Verify Running Containers

```bash
docker ps
```

Expected services:

- music_bot_app
- music_bot_redis

---

# Enter Main Container

```bash
docker exec -it music_bot_app bash
```

---

# Laravel Environment Variables

Create `.env`:

```bash
cp .env.example .env
```

Generate APP_KEY:

```bash
php artisan key:generate
```

---

# Redis Configuration

Inside `.env`:

```env
CACHE_STORE=redis
QUEUE_CONNECTION=redis
REDIS_CLIENT=phpredis
REDIS_HOST=redis
```

---

# Verify Redis

Open Laravel Tinker:

```bash
php artisan tinker
```

Test cache:

```php
Cache::put('test', 'hello', 60);
Cache::get('test');
```

Expected response:

```txt
"hello"
```

---

# Verify Installed Dependencies

## PHP

```bash
php -v
```

## Composer

```bash
composer --version
```

## Node

```bash
node -v
```

## NPM

```bash
npm -v
```

## FFmpeg

```bash
ffmpeg -version
```

## Redis CLI

```bash
redis-cli --version
```

---

# Install Frontend Dependencies

```bash
npm install
```

---

# Start Laravel Server

Inside the container:

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

Open in browser:

```txt
http://localhost:8000
```

---

# Current Services

| Service | Purpose |
|---|---|
| Laravel | Backend/API |
| Redis | Cache and queues |
| FFmpeg | Audio processing |
| Docker | Reproducible environment |

---

# Next Steps

- Integrate Discord bot
- Add React + Blade
- Implement observability
- Integrate Lavalink
- Configure queues/jobs
- Add dashboards and metrics
