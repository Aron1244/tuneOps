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

- tuneOps_app
- tuneOps_redis

---

# Enter Main Container

```bash
docker exec -it tuneOps_app bash
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

# Bot API (Redis + YouTube)

La API ya incluye la lógica base del bot para:
- cache de playlist en Redis
- resolución de playlist YouTube con `yt-dlp`
- estado de reproducción/cola/loop por `guild_id`

## Endpoints principales

```txt
POST   /api/playlists/resolve
PUT    /api/playlists/{playlistId}/cache
GET    /api/playlists/{playlistId}/cache
DELETE /api/playlists/{playlistId}/cache

GET    /api/guilds/{guildId}/playback
POST   /api/guilds/{guildId}/playlists/load
POST   /api/guilds/{guildId}/queue/items
POST   /api/guilds/{guildId}/queue/next
DELETE /api/guilds/{guildId}/queue
DELETE /api/guilds/{guildId}/queue/items/match?query=texto
PUT    /api/guilds/{guildId}/current
DELETE /api/guilds/{guildId}/current

POST   /api/guilds/{guildId}/pending-urls
POST   /api/guilds/{guildId}/pending-urls/pop
DELETE /api/guilds/{guildId}/pending-urls

POST   /api/guilds/{guildId}/loop/list
POST   /api/guilds/{guildId}/loop/single
DELETE /api/guilds/{guildId}/loop
```

## Ejemplos rápidos

Resolver playlist:

```json
{
  "url": "https://www.youtube.com/playlist?list=PL12345",
  "ttl_seconds": 3600
}
```

Encolar item:

```json
{
  "item": {
    "tipo": "youtube_pendiente",
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "titulo": "YouTube 1: dQw4w9WgXcQ"
  }
}
```

---

# Discord Bot (slash commands `/`)

El bot ya no usa Python. Ahora corre con Node + discord.js y consume la API Laravel.

## Variables necesarias en `.env`

```env
BOT_API_BASE_URL=http://app:8000/api
DISCORD_TOKEN=tu_token_bot
DISCORD_CLIENT_ID=tu_application_id
DISCORD_GUILD_ID=opcional_para_registro_rapido_local
```

## Levantar bot en Docker

```bash
docker compose up -d --build
docker logs -f tuneOps_discord_bot
```

Comandos disponibles en Discord:
`/play`, `/skip`, `/eliminar`, `/limpiar`, `/lista`, `/comandos`, `/debugvoz`, `/pahora`, `/last`, `/stop`, `/leave`, `/looplist`, `/loopsingle`, `/noloop`.

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
