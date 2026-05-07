# tuneOps - Discord Music Bot

## Requirements

- Docker Desktop
- WSL2 enabled (Windows)
- YouTube cookies file (`cookies.txt` in project root)

---

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Discord    │────▶│  Bot (Node) │────▶│  API (PHP)  │
│  User       │     │  discord.js │     │  Laravel    │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                            ┌─────────────────┼─────────────────┐
                            ▼                 ▼                 ▼
                     ┌───────────┐    ┌───────────┐    ┌───────────┐
                     │  Redis    │    │  MariaDB  │    │  yt-dlp   │
                     │  (queue)  │    │  (data)   │    │  (audio)  │
                     └───────────┘    └───────────┘    └───────────┘
```

---

## Services

| Service | Image | Port |
|---------|-------|------|
| API (nginx + PHP-FPM) | tuneops-app | 8001 |
| Discord Bot | tuneops-discord-bot | - |
| Redis | redis:7 | 6379 |
| MariaDB | mariadb:11 | 3306 |
| nginx | nginx:alpine | 8001 |

---

## Setup

### 1. Environment

```bash
cp .env.example .env
```

Add your YouTube cookies in project root as `cookies.txt`.

### 2. Build & Start

```bash
docker compose up -d --build
```

### 3. Verify

```bash
docker compose ps
```

---

## Configuration

### Required .env variables

```env
# Discord Bot
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_app_client_id
DISCORD_GUILD_ID=optional_guild_id

# API (uses nginx, not app:8000)
BOT_API_BASE_URL=http://nginx:80/api

# YouTube cookies (file must exist in project root)
YOUTUBE_COOKIES_FILE=/app/cookies.txt

# Database
DB_HOST=bot_db
DB_DATABASE=tuneOps_bot
DB_USERNAME=laravel
DB_PASSWORD=secret
```

---

## Discord Commands

| Command | Description |
|---------|-------------|
| `/play <query/url>` | Play music (YouTube search or URL) |
| `/skip` | Skip current song |
| `/eliminar <name>` | Remove song from queue |
| `/limpiar` | Clear queue |
| `/lista` | Show queue |
| `/looplist` | Loop entire queue |
| `/loopsingle` | Loop current song |
| `/noloop` | Disable loop |
| `/stop` | Stop and clear |
| `/leave` | Disconnect from voice |

---

## API Endpoints

### Playlists

```bash
# Resolve playlist URLs
POST /api/playlists/resolve
{"url": "https://www.youtube.com/playlist?list=PLxxx", "ttl_seconds": 3600}
```

### Guild Playback

```bash
# Get playback state
GET /api/guilds/{guildId}/playback

# Add to queue
POST /api/guilds/{guildId}/queue/items
{"item": {"tipo": "youtube_pendiente", "url": "https://...", "titulo": "Song Title"}}

# Get next item
POST /api/guilds/{guildId}/queue/next

# Clear queue
DELETE /api/guilds/{guildId}/queue

# Load playlist
POST /api/guilds/{guildId}/playlists/load
{"url": "https://www.youtube.com/playlist?list=PLxxx", "replace_pending": true}

# Loop modes
POST /api/guilds/{guildId}/loop/list    # Loop entire list
POST /api/guilds/{guildId}/loop/single # Loop single song
DELETE /api/guilds/{guildId}/loop       # Disable loop
```

---

## Features

- ✅ YouTube search and direct URLs
- ✅ YouTube playlists (extracts all videos)
- ✅ Multiple URL support (any yt-dlp supported site)
- ✅ Queue management with duplicates detection
- ✅ Loop modes (list/single)
- ✅ Skip, remove, clear commands
- ✅ Redis-based state persistence
- ✅ YouTube cookies to bypass rate limits
- ✅ Stream directly via yt-dlp (no play-dl)
- ✅ nginx + PHP-FPM for reliable JSON parsing

---

## Development

### Rebuild specific service

```bash
docker compose build app
docker compose build discord-bot
docker compose up -d
```

### View logs

```bash
docker compose logs -f app
docker compose logs -f discord-bot
docker compose logs -f nginx
```

### Test API

```bash
# Simple test
curl http://localhost:8001/api/test

# Resolve playlist
curl -X POST http://localhost:8001/api/playlists/resolve \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=xxxx"}'
```

---

## Notes

- Cookies file (`cookies.txt`) is gitignored - add your own from browser extension
- Bot automatically extracts playlist videos and adds each to queue
- Failed streams skip to next song instead of re-adding to queue
- Uses nginx on port 8001, not the old PHP built-in server on port 8000
