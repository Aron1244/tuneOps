# tuneOps - Discord Music Bot

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Aron1244/tuneOps)

Bot de música para Discord con panel web para gestionar tonos personalizados. Construido con Node.js (discord.js), yt-dlp para streaming de audio y Laravel + React para la API y frontend.

## Requirements

- Docker Desktop
- WSL2 enabled (Windows)
- YouTube cookies (opcional: archivo `cookies.txt` en raíz o variable `YOUTUBE_COOKIE` en .env)

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

| Service | Container | Image | Port |
|---------|-----------|-------|------|
| API (PHP-FPM) | tuneOps_app | tuneops-app | - |
| Web (nginx) | tuneOps_nginx | nginx:alpine | 8001 |
| Discord Bot | tuneOps_discord_bot | tuneops-app | - |
| Redis | tuneOps_redis | redis:7-alpine | 6379 |
| MariaDB | tuneOps_bot_db | mariadb:11 | 3306 |

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

### General

| Command | Description |
|---------|-------------|
| `/hora` | Muestra la hora actual en PDT, CDT, CLT y UTC |
| `/comandos` | Lista todos los comandos disponibles |

### Reproducción

| Command | Description |
|---------|-------------|
| `/play <input>` | Reproduce música (URL de YouTube o búsqueda) |
| `/skip` | Salta la canción actual |
| `/stop` | Detiene reproducción y limpia la cola |
| `/lista` | Muestra estado de reproducción y cola |
| `/pahora` | Muestra las próximas 5 canciones |
| `/last` | Salta a la última canción y limpia el resto |

### Loop

| Command | Description |
|---------|-------------|
| `/looplist` | Activa loop de toda la lista |
| `/loopsingle` | Loop de la canción actual |
| `/noloop` | Desactiva cualquier modo loop |

### Tonos personalizados

| Command | Description |
|---------|-------------|
| `/tonos` | Lista todos los tonos guardados |
| `/creartono <nombre> <link>` | Guarda un tono por nombre |
| `/tono <nombre>` | Reproduce un tono guardado |
| `/editartono <nombre> <link>` | Edita el link de un tono |
| `/eliminartono <nombre>` | Elimina un tono guardado |

### Cola

| Command | Description |
|---------|-------------|
| `/eliminar <texto>` | Elimina canción por coincidencia en título |
| `/limpiar` | Limpia la cola y pendientes |

### Voz

| Command | Description |
|---------|-------------|
| `/leave` | Desconecta el bot del canal de voz |
| `/debugvoz` | Muestra estado interno de voz/cola (debug) |

---

## API Endpoints

### Playlists

```bash
# Resolve playlist URLs
POST /api/playlists/resolve
{"url": "https://www.youtube.com/playlist?list=PLxxx", "ttl_seconds": 3600}
```

### Tones

```bash
# Create or update tone
POST /api/tones
{"name": "intro", "url": "https://www.youtube.com/watch?v=xxxx"}

# Get tone by name
GET /api/tones?name=intro
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

- 🎵 Reproducción desde YouTube (búsqueda o URL directa)
- 📦 Extracción automática de playlists de YouTube (todas las canciones a la cola)
- 🔗 Soporte para cualquier sitio soportado por yt-dlp
- 🔄 Detección de duplicados en la cola
- 🔁 Modos loop (lista completa o canción individual)
- 🏃skip, eliminar, limpiar comandos
- 📊 Panel web CRUD para gestionar tonos (`/tones`)
- 🍪 Cookies de YouTube (archivo o variable de entorno) para evitar límites
- 🎧 Streaming directo via yt-dlp con retry automático
- 🔍 Cache de búsquedas para evitar búsquedas repetidas
- 🌐 Estado del bot con canción actual y cantidad en cola
- 🕐 Comando de hora mundial
- 🐳 Todo corriendo en Docker (nginx + PHP-FPM + Laravel + Redis + MariaDB)

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

- El archivo de cookies (`cookies.txt`) está gitignored - añade el tuyo desde una extensión de navegador
- El bot extrae automáticamente los videos de playlists y los añade a la cola
- Streams fallidos saltan a la siguiente canción en lugar de reintentarlo infinitamente
- El panel web está disponible en `http://localhost:8001/tones`
- El bot usa `play-dl` para búsqueda y `yt-dlp` para streaming de audio
- Puedes usar `YOUTUBE_COOKIE` como variable de entorno en lugar del archivo
