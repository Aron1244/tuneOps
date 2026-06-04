import 'dotenv/config';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { PassThrough } from 'node:stream';

import {
    AudioPlayerStatus,
    NoSubscriberBehavior,
    VoiceConnectionStatus,
    createAudioPlayer,
    createAudioResource,
    entersState,
    joinVoiceChannel,
} from '@discordjs/voice';
import {
    ChannelType,
    Client,
    Events,
    GatewayIntentBits,
    SlashCommandBuilder,
} from 'discord.js';
import play from 'play-dl';

process.on('unhandledRejection', (reason) => {
     
    console.error('unhandledRejection:', reason);
});

process.on('uncaughtException', (error) => {
     
    console.error('uncaughtException:', error);
});

const config = {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.DISCORD_GUILD_ID || null,
    apiBaseUrl: (process.env.BOT_API_BASE_URL || 'http://localhost:8000/api').replace(/\/+$/, ''),
};

function loadYoutubeCookieString() {
    if (process.env.YOUTUBE_COOKIE && process.env.YOUTUBE_COOKIE.trim() !== '') {
        return process.env.YOUTUBE_COOKIE.trim();
    }

    const cookieFile = '/app/cookies.txt';

    if (!fs.existsSync(cookieFile)) {
        return null;
    }

    const content = fs.readFileSync(cookieFile, 'utf-8');
    const pairs = [];

    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }

        const parts = trimmed.split('\t');

        if (parts.length < 7) {
            continue;
        }

        const name = parts[5];
        const value = parts[6];

        if (name && value) {
            pairs.push(`${name}=${value}`);
        }
    }

    return pairs.length > 0 ? pairs.join('; ') : null;
}

async function extractPlaylistUrls(url) {
    return new Promise((resolve, reject) => {
        const args = [
            '--flat-playlist',
            '--print', '%(url)s',
            '--ignore-errors',
            '--no-warnings',
            '--no-download',
            '--retries', '3',
        ];
        
        const cookieFile = '/app/cookies.txt';

        if (fs.existsSync(cookieFile)) {
            args.push('--cookies', cookieFile);
        }
        
        args.push(url);
        
        const proc = spawn('/usr/local/bin/yt-dlp', args);
        
        let output = '';
        let errorData = '';
        
        proc.stdout.on('data', (chunk) => {
            output += chunk.toString();
        });
        
        proc.stderr.on('data', (chunk) => {
            errorData += chunk.toString();
        });
        
        proc.on('close', (code) => {
            if (code !== 0 && !output) {
                reject(new Error(`yt-dlp failed: ${errorData}`));

                return;
            }
            
            const urls = output.split('\n')
                .map(line => line.trim())
                .filter(line => line.startsWith('http'));
            
            resolve(urls);
        });
        
        proc.on('error', reject);
    });
}

async function getAudioStream(videoUrl, attempt = 0) {
    const maxAttempts = 3;
    const delay = attempt * 1500;
    
    if (delay > 0) {
        await new Promise(r => setTimeout(r, delay));
    }
    
    return new Promise((resolve, reject) => {
        const args = [
            '-f', 'bestaudio[acodec=opus]/bestaudio/best',
            '-o', '-',
            '--no-playlist',
            '--no-warnings',
            '--live-from-start',
            '--retries', '5',
            '--fragment-retries', '5',
            '--buffer-size', '16M',
            '--js-runtimes', 'node',
        ];
        
        const cookieFile = '/app/cookies.txt';

        if (fs.existsSync(cookieFile)) {
            args.push('--cookies', cookieFile);
        }
        
        args.push(videoUrl);
        
        const proc = spawn('/usr/local/bin/yt-dlp', args);
        
        const passThrough = new PassThrough();
        
        let errorOccurred = false;
        let ytError = '';
        
        proc.stdout.on('error', (err) => {
            console.error('stdout error:', err.message);

            if (!errorOccurred) {
                errorOccurred = true;
                passThrough.destroy(err);
            }
        });
        
        passThrough.on('error', (err) => {
            console.error('passThrough error:', err.message);
        });
        
        proc.on('error', (err) => {
            console.error('proc error:', err.message);

            if (!errorOccurred) {
                errorOccurred = true;
                passThrough.end();
            }
        });
        
        proc.stderr.on('data', (chunk) => {
            const msg = chunk.toString();

            if (msg.includes('ERROR')) {
                ytError += msg;
                console.error('yt-dlp:', msg.trim());
            }
        });
        
        proc.on('close', (code) => {
            console.log('yt-dlp exited with code:', code);

            if (!errorOccurred && ytError && code !== 0 && attempt < maxAttempts - 1) {
                console.log(`Retrying getAudioStream (attempt ${attempt + 1})...`);
                setTimeout(() => {
                    getAudioStream(videoUrl, attempt + 1)
                        .then(resolve)
                        .catch(reject);
                }, 500);

                return;
            }

            if (!errorOccurred) {
                passThrough.end();
            }
        });
        
        proc.stdout.pipe(passThrough);
        resolve(passThrough);
    });
}

if (!config.token || !config.clientId) {
    throw new Error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in environment.');
}

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

const voiceState = new Map();
const searchCache = new Map();
const SEARCH_CACHE_TTL = 5 * 60 * 1000;

const commands = [
    new SlashCommandBuilder()
        .setName('creartono')
        .setDescription('Guarda un tono personalizado por nombre')
        .addStringOption((opt) => opt.setName('nombre').setDescription('Nombre del tono').setRequired(true))
        .addStringOption((opt) => opt.setName('link').setDescription('URL del tono').setRequired(true)),
    new SlashCommandBuilder()
        .setName('tono')
        .setDescription('Agrega un tono guardado a la cola')
        .addStringOption((opt) => opt.setName('nombre').setDescription('Nombre del tono').setRequired(true)),
    new SlashCommandBuilder()
        .setName('eliminartono')
        .setDescription('Elimina un tono guardado')
        .addStringOption((opt) => opt.setName('nombre').setDescription('Nombre del tono').setRequired(true)),
    new SlashCommandBuilder()
        .setName('editartono')
        .setDescription('Edita el link de un tono guardado')
        .addStringOption((opt) => opt.setName('nombre').setDescription('Nombre del tono').setRequired(true))
        .addStringOption((opt) => opt.setName('link').setDescription('Nuevo link (YouTube URL)').setRequired(true)),
    new SlashCommandBuilder()
        .setName('tonos')
        .setDescription('Muestra todos los tonos guardados'),
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Reproduce música desde YouTube (URL o búsqueda)')
        .addStringOption((opt) => opt.setName('input').setDescription('URL o texto').setRequired(true)),
    new SlashCommandBuilder().setName('skip').setDescription('Salta la canción actual'),
    new SlashCommandBuilder()
        .setName('eliminar')
        .setDescription('Elimina una canción por coincidencia en título')
        .addStringOption((opt) => opt.setName('nombre').setDescription('Texto a buscar').setRequired(true)),
    new SlashCommandBuilder().setName('limpiar').setDescription('Limpia la cola y pendientes'),
    new SlashCommandBuilder().setName('lista').setDescription('Muestra estado de reproducción y cola'),
    new SlashCommandBuilder().setName('comandos').setDescription('Lista comandos disponibles'),
    new SlashCommandBuilder().setName('debugvoz').setDescription('Estado interno de voz/cola/cache'),
    new SlashCommandBuilder().setName('pahora').setDescription('Muestra próximas 5 canciones'),
    new SlashCommandBuilder().setName('last').setDescription('Salta a la última canción y limpia el resto'),
    new SlashCommandBuilder().setName('stop').setDescription('Detiene reproducción y limpia cola'),
    new SlashCommandBuilder().setName('leave').setDescription('Desconecta el bot del canal de voz'),
    new SlashCommandBuilder().setName('looplist').setDescription('Activa loop de lista'),
    new SlashCommandBuilder().setName('loopsingle').setDescription('Activa loop de canción actual'),
    new SlashCommandBuilder()
        .setName('noloop')
        .setDescription('Desactiva cualquier loop'),
    new SlashCommandBuilder()
        .setName('hora')
        .setDescription('Muestra la hora actual en diferentes zonas horarias'),
];

function apiUrl(path) {
    return `${config.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

function normalizeToneName(name) {
    return name.trim().toLowerCase();
}

function includesUrl(text) {
    return /https?:\/\//i.test(text);
}

async function apiRequest(path, { method = 'GET', body } = {}) {
    const url = apiUrl(path);
    console.log(`API request: ${method} ${url}`, body ? JSON.stringify(body).substring(0, 200) : '');
    const response = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let json = {};

    try {
        json = text ? JSON.parse(text) : {};
    } catch {
        console.error('apiRequest failed to parse JSON:', text);
    }

    if (!response.ok) {
        console.error(`API error ${response.status}: ${method} ${path}`, json);

        throw new Error(json.message || `API ${method} ${path} failed (${response.status})`);
    }

    return json;
}

function getGuildRuntime(guildId) {
    if (!voiceState.has(guildId)) {
        const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play,
            },
        });

        const runtime = {
            player,
            connection: null,
            textChannelId: null,
            currentTitle: null,
        };

        player.on('error', (error) => {
            console.error(`audio player error [${guildId}]:`, error.message);
        });

        player.on(AudioPlayerStatus.Idle, async () => {
            console.log(`Player idle for guild ${guildId}`);

            try {
                await playNext(guildId);
            } catch (error) {
                console.error('playNext error:', error.message);
            }
        });

        voiceState.set(guildId, runtime);
    }

    return voiceState.get(guildId);
}

async function notifyGuild(guildId, message) {
    const runtime = getGuildRuntime(guildId);

    if (!runtime.textChannelId) {
        return;
    }

    try {
        const channel = await client.channels.fetch(runtime.textChannelId);

        if (channel?.isTextBased()) {
            await channel.send(message);
        }
    } catch {
        // ignore text channel notification failures
    }
}

async function ensureVoiceConnection(interaction) {
    if (!interaction.guild) {
        throw new Error('Este comando solo funciona en servidores.');
    }

    const memberVoice = interaction.member?.voice?.channel;
    const guildId = interaction.guild.id;
    const runtime = getGuildRuntime(guildId);

    if (runtime.connection && runtime.connection.state.status !== VoiceConnectionStatus.Destroyed) {
        return runtime;
    }

    if (!memberVoice || memberVoice.type !== ChannelType.GuildVoice) {
        throw new Error('Debes estar en un canal de voz.');
    }

    const connection = joinVoiceChannel({
        channelId: memberVoice.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: true,
    });

    connection.subscribe(runtime.player);

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
    } catch {
        connection.destroy();

        throw new Error('No pudo conectarse al canal de voz.');
    }

    runtime.connection = connection;
    runtime.textChannelId = interaction.channelId;

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
            ]);
        } catch {
            connection.destroy();
            runtime.connection = null;
        }
    });

    connection.on(VoiceConnectionStatus.Destroyed, () => {
        runtime.connection = null;
    });

    return runtime;
}

async function resolveTrack(input) {
    const trimmed = input.trim();
    const isUrl = /^https?:\/\//i.test(trimmed);

    if (isUrl) {
        return {
            url: trimmed,
            title: trimmed,
        };
    }

    const cacheKey = trimmed.toLowerCase();
    const cached = searchCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
        return cached.result;
    }

    const [result] = await play.search(trimmed, {
        source: { youtube: 'video' },
        limit: 1,
    });

    if (!result?.url) {
        throw new Error('No se encontró ningún video para esa búsqueda.');
    }

    const resolved = {
        url: result.url,
        title: result.title || trimmed,
    };

    searchCache.set(cacheKey, { result: resolved, timestamp: Date.now() });

    if (searchCache.size > 100) {
        const oldest = [...searchCache.entries()]
            .sort((a, b) => a[1].timestamp - b[1].timestamp)
            .slice(0, 50);
        oldest.forEach(([key]) => searchCache.delete(key));
    }

    return resolved;
}

async function playNext(guildId, attempt = 0) {
    console.log(`=== playNext called (attempt ${attempt}) ===`);
    const runtime = getGuildRuntime(guildId);

    if (!runtime.connection || runtime.connection.state.status === VoiceConnectionStatus.Destroyed) {
        console.log('No voice connection, skipping');

        return;
    }

    const response = await apiRequest(`/guilds/${guildId}/queue/next`, { method: 'POST' });

    if (!response.has_item || !response.next) {
        runtime.currentTitle = null;

        return;
    }

    const item = response.next;
    const sourceUrl = item.url || item.video_url || item.webpage_url;

    if (!sourceUrl) {
        await playNext(guildId);

        return;
    }

    const title = item.titulo || item.title || sourceUrl;

    try {
        console.log(`Getting audio via yt-dlp for: ${sourceUrl}`);
        const audioStream = await getAudioStream(sourceUrl);
        console.log(`Got audio stream, creating resource...`);
        
        const resource = createAudioResource(audioStream, {
            inlineVolume: true,
        });

        runtime.currentTitle = title;
        runtime.player.play(resource);
    } catch (error) {
        console.error('play.stream failed:', error);
        
        if (attempt < 2) {
            console.log(`Retrying playNext (attempt ${attempt + 1})...`);
            await new Promise(r => setTimeout(r, 1000));

            return playNext(guildId, attempt + 1);
        }
        
        await apiRequest(`/guilds/${guildId}/current`, { method: 'DELETE' });
        await notifyGuild(guildId, `No pude reproducir **${title}**: ${error.message}`);
        
        await playNext(guildId, 0);
    }
}

async function startPlaybackIfIdle(guildId) {
    const runtime = getGuildRuntime(guildId);
    console.log(`startPlaybackIfIdle: player status = ${runtime.player.state.status}`);

    if (runtime.player.state.status !== AudioPlayerStatus.Playing) {
        await playNext(guildId);
    } else {
        console.log('Player already playing, skipping playNext');
    }
}

async function setCommands() {
    const commandData = commands.map((command) => command.toJSON());

    if (config.guildId) {
        const guild = await client.guilds.fetch(config.guildId);
        await guild.commands.set(commandData);

        return;
    }

    await client.application.commands.set(commandData);
}

client.once(Events.ClientReady, async () => {
    await setCommands();

    for (const [, runtime] of voiceState) {
        runtime.player.on(AudioPlayerStatus.Idle, async () => {
            // no-op; handlers are attached per guild runtime
        });
    }

    console.log(`Discord bot conectado como ${client.user.tag}`);

    client.on(Events.Disconnect, () => {
        console.log('Discord client disconnected, attempting to reconnect...');
    });

    client.on(Events.Reconnecting, () => {
        console.log('Discord client reconnecting...');
    });

    setInterval(async () => {
        for (const [guildId, runtime] of voiceState) {
            if (!runtime.connection || runtime.connection.state.status === VoiceConnectionStatus.Destroyed) {
                continue;
            }

            try {
                const state = await apiRequest(`/guilds/${guildId}/playback`).catch(() => null);
                const queueCount = state?.queue_count || 0;
                const current = state?.current;

                if (current) {
                    const activity = queueCount > 0 
                        ? `🎵 ${current.titulo || current.title} | ${queueCount} en cola`
                        : `🎵 ${current.titulo || current.title}`;

                    client.user.setActivity({
                        name: activity.slice(0, 128),
                        type: 2,
                    });
                    break;
                } else if (queueCount > 0) {
                    client.user.setActivity({
                        name: `${queueCount} canciones en cola`,
                        type: 2,
                    });
                    break;
                } else {
                    client.user.setActivity({
                        name: '/play para reproducir música',
                        type: 2,
                    });
                }
            } catch { /* ignore */ }
        }
    }, 30_000);

    async function waitForApi(maxAttempts = 30, delayMs = 2000) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const response = await fetch(`${config.apiBaseUrl}/test`);

                if (response.ok) {
                    console.log(`API disponible tras ${attempt} intento(s)`);

                    return true;
                }
            } catch { /* ignore */ }

            console.log(`Esperando API... intento ${attempt}/${maxAttempts}`);
            await new Promise(r => setTimeout(r, delayMs));
        }

        console.warn('API no disponible tras timeout, continuando igual');

        return false;
    }

    await waitForApi();

    try {
        if (config.guildId) {
            const guild = await client.guilds.fetch(config.guildId);
            const systemChannel = guild.systemChannel;

            if (systemChannel) {
                await systemChannel.send('✅ tuneOps bot listo y esperando comandos.');
            }
        }
    } catch (err) {
        console.log('No se pudo enviar mensaje de listo:', err.message);
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand() || !interaction.guildId) {
        return;
    }

    const guildId = interaction.guildId;
    const runtime = getGuildRuntime(guildId);
    runtime.textChannelId = interaction.channelId;

    try {
        if (interaction.commandName === 'creartono') {
            const name = interaction.options.getString('nombre', true).trim();
            const url = interaction.options.getString('link', true).trim();

            const result = await apiRequest('/tones', {
                method: 'POST',
                body: { name, url },
            });

            await interaction.reply(
                result.created
                    ? `✅ Tono guardado: **${result.name}**`
                    : `♻️ Tono actualizado: **${result.name}**`,
            );

            return;
        }

        if (interaction.commandName === 'tono') {
            const requestedName = interaction.options.getString('nombre', true);

            if (includesUrl(requestedName)) {
                await interaction.reply('❌ Este comando solo acepta nombre. Usa `/creartono <nombre> <link>` para guardar un tono.');

                return;
            }

            await interaction.deferReply();
            await ensureVoiceConnection(interaction);

            const tone = await apiRequest(`/tones?name=${encodeURIComponent(normalizeToneName(requestedName))}`);

            const isPlaylist = /^https?:\/\/.*[?&]list=/i.test(tone.url);

            if (isPlaylist) {
                try {
                    const videoUrls = await extractPlaylistUrls(tone.url);
                    let addedCount = 0;

                    for (const videoUrl of videoUrls) {
                        try {
                            await apiRequest(`/guilds/${guildId}/queue/items`, {
                                method: 'POST',
                                body: { item: { tipo: 'youtube_pendiente', url: videoUrl, titulo: videoUrl } },
                            });
                            addedCount++;
                        } catch { /* ignore */ }
                    }

                    await interaction.editReply(`📦 Playlist añadida: ${addedCount} canción(es) en cola.`);
                    startPlaybackIfIdle(guildId).catch((err) => {
                        console.error('startPlaybackIfIdle error:', err.message);
                    });

                    return;
                } catch {
                    await interaction.editReply(`⚠️ Error al procesar playlist, intentando como URL simple.`);
                }
            }

            const state = await apiRequest(`/guilds/${guildId}/playback`).catch(() => ({ queue: [] }));
            const isDuplicate = state.queue.some((item) => item.url === tone.url);

            if (isDuplicate) {
                await interaction.editReply(`⚠️ **${tone.name}** ya está en la cola.`);

                return;
            }

            await apiRequest(`/guilds/${guildId}/queue/items`, {
                method: 'POST',
                body: { item: { tipo: 'youtube_pendiente', url: tone.url, titulo: tone.name } },
            });

            await interaction.editReply(`📝 Tono añadido a la cola: **${tone.name}**`);

            startPlaybackIfIdle(guildId).catch((err) => {
                console.error('startPlaybackIfIdle error:', err.message);
            });

            return;
        }

        if (interaction.commandName === 'eliminartono') {
            const name = interaction.options.getString('nombre', true).trim();

            try {
                await apiRequest(`/tones?name=${encodeURIComponent(normalizeToneName(name))}`, {
                    method: 'DELETE',
                });
                await interaction.reply(`✅ Tono eliminado: **${name}**`);
            } catch (error) {
                if (error.message.includes('404') || error.message.includes('Not found')) {
                    await interaction.reply(`❌ No se encontró el tono: **${name}**`);
                } else {
                    throw error;
                }
            }

            return;
        }

        if (interaction.commandName === 'editartono') {
            const name = interaction.options.getString('nombre', true).trim();
            const newLink = interaction.options.getString('link', true).trim();

            if (!/^https?:\/\//i.test(newLink)) {
                await interaction.reply('❌ El link debe ser una URL válida (http:// o https://)');

                return;
            }

            try {
                await apiRequest(`/tones?name=${encodeURIComponent(normalizeToneName(name))}`, {
                    method: 'PUT',
                    body: { url: newLink },
                });
                await interaction.reply(`✏️ Tono actualizado: **${name}** → ${newLink}`);
            } catch (error) {
                if (error.message.includes('404') || error.message.includes('Not found')) {
                    await interaction.reply(`❌ No se encontró el tono: **${name}**`);
                } else {
                    throw error;
                }
            }

            return;
        }

        if (interaction.commandName === 'tonos') {
            await interaction.deferReply();

            const result = await apiRequest('/tones/list');

            if (!result.tones || result.tones.length === 0) {
                await interaction.editReply('📭 No hay tonos guardados. Usa `/creartono <nombre> <link>` para crear uno.');

                return;
            }

            const list = result.tones
                .map(t => `• **${t.name}**`)
                .join('\n');

            await interaction.editReply(`🎵 **Tonos guardados** (${result.tones.length}):\n${list}`);

            return;
        }

        if (interaction.commandName === 'play') {
            const input = interaction.options.getString('input', true);
            await interaction.deferReply();
            await ensureVoiceConnection(interaction);

            const isYouTubePlaylist = /^https?:\/\/.*[?&]list=/i.test(input);

            if (isYouTubePlaylist) {
                try {
                    const videoUrls = await extractPlaylistUrls(input);
                    
                    if (!videoUrls || videoUrls.length === 0) {
                        await interaction.editReply('❌ No se pudieron extraer canciones de la playlist.');

                        return;
                    }
                    
                    let addedCount = 0;

                    for (const videoUrl of videoUrls) {
                        try {
                            await apiRequest(`/guilds/${guildId}/queue/items`, {
                                method: 'POST',
                                body: { item: { tipo: 'youtube_pendiente', url: videoUrl, titulo: videoUrl } },
                            });
                            addedCount++;
                        } catch {
                            // Ignore failed items
                        }
                    }
                    
                    await startPlaybackIfIdle(guildId);
                    await interaction.editReply(
                        `📦 Playlist cargada: ${addedCount} canción(es) en cola.`,
                    );
                } catch (err) {
                    await interaction.editReply(`❌ Error cargando playlist: ${err.message}`);
                }

                return;
            }

            const isUrl = /^https?:\/\//i.test(input);
            
            if (isUrl) {
                await apiRequest(`/guilds/${guildId}/queue/items`, {
                    method: 'POST',
                    body: { item: { tipo: 'youtube_pendiente', url: input, titulo: input } },
                });

                await interaction.editReply(`📝 Añadido a la cola: **${input}**`);

                startPlaybackIfIdle(guildId).catch((err) => {
                    console.error('startPlaybackIfIdle error:', err.message);
                });

                return;
            }

            const [track, state] = await Promise.all([
                resolveTrack(input),
                apiRequest(`/guilds/${guildId}/playback`).catch(() => ({ queue: [] })),
            ]);

            if (!track?.url) {
                await interaction.editReply(`❌ No encontré ningún resultado para "${input}".`);

                return;
            }
            
            const isDuplicate = state.queue.some(item => item.url === track.url);
            
            if (isDuplicate) {
                await interaction.editReply(`⚠️ **${track.title}** ya está en la cola.`);

                return;
            }
            
            await apiRequest(`/guilds/${guildId}/queue/items`, {
                method: 'POST',
                body: { item: { tipo: 'youtube_pendiente', url: track.url, titulo: track.title } },
            });

            await interaction.editReply(`📝 Añadido a la cola: **${track.title}**`);

            startPlaybackIfIdle(guildId).catch((err) => {
                console.error('startPlaybackIfIdle error:', err.message);
            });

            return;
        }

        if (interaction.commandName === 'skip') {
            await interaction.reply('⏭ Canción saltada.');
            runtime.player.stop(true);

            return;
        }

        if (interaction.commandName === 'eliminar') {
            const query = interaction.options.getString('nombre', true);
            const result = await apiRequest(`/guilds/${guildId}/queue/items/match`, {
                method: 'DELETE',
                body: { query },
            });

            await interaction.reply(
                result.found
                    ? `❌ Eliminado: **${result.removed?.titulo || 'Desconocido'}**`
                    : 'No se encontró ninguna canción con ese nombre.',
            );

            return;
        }

        if (interaction.commandName === 'limpiar') {
            await apiRequest(`/guilds/${guildId}/queue`, { method: 'DELETE' });
            runtime.player.stop(true);

            await interaction.reply('🧹 Cola y pendientes limpiados.');

            return;
        }

        if (interaction.commandName === 'lista') {
            const state = await apiRequest(`/guilds/${guildId}/playback`);
            const queueLines = (state.queue || [])
                .slice(0, 25)
                .map((item, index) => `${index + 1}. ${(item.titulo || item.title || 'Desconocido')}`)
                .join('\n');

            const text = [
                '**🎶 Estado de reproducción**',
                state.current ? `▶️ Sonando: ${state.current.titulo || state.current.title || 'Desconocido'}` : '⏸ Sin reproducción',
                state.queue_count ? `\n**📝 Cola (${state.queue_count})**\n${queueLines}` : '\n🧾 Cola vacía',
                state.pending_count ? `\n📦 Pendientes en cache: ${state.pending_count}` : '',
            ].join('\n');

            await interaction.reply(text.slice(0, 1950));

            return;
        }

        if (interaction.commandName === 'comandos') {
            await interaction.deferReply();
            await interaction.editReply(
                `📜 **Comandos disponibles**\n\n` +
                `**🌍 General**\n` +
                `/hora - Muestra la hora en diferentes zonas horarias\n\n` +
                `**🎵 Reproducción**\n` +
                `/play <URL/búsqueda> - Reproduce música desde YouTube\n` +
                `/skip - Salta la canción actual\n` +
                `/stop - Detiene reproducción y limpia cola\n` +
                `/lista - Muestra estado de reproducción y cola\n` +
                `/pahora - Muestra las próximas 5 canciones\n` +
                `/last - Salta a la última canción y limpia el resto\n\n` +
                `**🔄 Loops**\n` +
                `/looplist - Activa loop de lista\n` +
                `/loopsingle - Activa loop de canción actual\n` +
                `/noloop - Desactiva cualquier loop\n\n` +
                `**🔊 Tonos personalizados**\n` +
                `/tonos - Muestra todos los tonos guardados\n` +
                `/creartono <nombre> <link> - Guarda un tono por nombre\n` +
                `/tono <nombre> - Reproduce un tono guardado\n` +
                `/editartono <nombre> <link> - Edita el link de un tono\n` +
                `/eliminartono <nombre> - Elimina un tono guardado\n\n` +
                `**🧹 Cola**\n` +
                `/eliminar <texto> - Elimina canción por título\n` +
                `/limpiar - Limpia la cola y pendientes\n\n` +
                `**🎙️ Voz**\n` +
                `/leave - Desconecta el bot del canal de voz\n` +
                `/comandos - Muestra este mensaje\n` +
                `/debugvoz - Estado interno de voz/cola (debug)`,
            );

            return;
        }

        if (interaction.commandName === 'debugvoz') {
            const state = await apiRequest(`/guilds/${guildId}/playback`);
            await interaction.reply(
                [
                    `Guild: ${guildId}`,
                    `Conectado: ${runtime.connection ? 'sí' : 'no'}`,
                    `Player: ${runtime.player.state.status}`,
                    `Queue: ${state.queue_count}`,
                    `Pendientes: ${state.pending_count}`,
                    `Loop: ${state.loop_mode || 'none'}`,
                ].join('\n'),
            );

            return;
        }

        if (interaction.commandName === 'pahora') {
            const state = await apiRequest(`/guilds/${guildId}/playback`);
            const upcoming = (state.queue || []).slice(0, 5);

            if (!upcoming.length) {
                await interaction.reply('No hay canciones próximas.');

                return;
            }

            await interaction.reply(
                `⏩ Próximas canciones:\n${upcoming
                    .map((item, idx) => `${idx + 1}. ${item.titulo || item.title || 'Desconocido'}`)
                    .join('\n')}`,
            );

            return;
        }

        if (interaction.commandName === 'last') {
            const state = await apiRequest(`/guilds/${guildId}/playback`);
            const queue = state.queue || [];
            const pending = state.pending_urls || [];

            if (!queue.length && !pending.length) {
                await interaction.reply('No hay canciones disponibles para /last.');

                return;
            }

            let lastItem = queue.at(-1);

            if (!lastItem && pending.length) {
                const url = pending.at(-1);
                lastItem = { tipo: 'youtube_pendiente', url, titulo: `YouTube: ${url}` };
            }

            await apiRequest(`/guilds/${guildId}/queue`, { method: 'DELETE' });
            await apiRequest(`/guilds/${guildId}/queue/items`, { method: 'POST', body: { item: lastItem } });
            runtime.player.stop(true);

            await interaction.reply(`🎶 Reproduciendo (última): **${lastItem.titulo || 'Desconocido'}**`);

            return;
        }

        if (interaction.commandName === 'stop') {
            await apiRequest(`/guilds/${guildId}/queue`, { method: 'DELETE' });
            runtime.player.stop(true);
            await interaction.reply('⏹ Música detenida y cola limpiada.');

            return;
        }

        if (interaction.commandName === 'leave') {
            await apiRequest(`/guilds/${guildId}/queue`, { method: 'DELETE' });
            runtime.player.stop(true);
            runtime.connection?.destroy();
            runtime.connection = null;
            await interaction.reply('👋 Desconectado del canal de voz.');

            return;
        }

        if (interaction.commandName === 'looplist') {
            const result = await apiRequest(`/guilds/${guildId}/loop/list`, { method: 'POST' });
            await interaction.reply(`🔁 Loop de lista activado (${result.count} canciones).`);

            return;
        }

        if (interaction.commandName === 'loopsingle') {
            await apiRequest(`/guilds/${guildId}/loop/single`, { method: 'POST' });
            await interaction.reply('🔂 Loop de canción actual activado.');

            return;
        }

        if (interaction.commandName === 'noloop') {
            await apiRequest(`/guilds/${guildId}/loop`, { method: 'DELETE' });
            await interaction.reply('⏹ Modo loop desactivado.');

            return;
        }

        if (interaction.commandName === 'hora') {
            const now = new Date();

            const formatTime = (utcHour, offsetHours) => {
                const total = utcHour + offsetHours;
                const hour = ((total + 24) % 24).toString().padStart(2, '0');
                const minute = now.getUTCMinutes().toString().padStart(2, '0');

                return `${hour}:${minute}`;
            };

            const utcHour = now.getUTCHours();

            const pdt = formatTime(utcHour, -7);
            const cdt = formatTime(utcHour, -5);
            const clt = formatTime(utcHour, -4);
            const utc = formatTime(utcHour, 0);

            await interaction.reply(
                `🌍 **Hora mundial**\n\n` +
                `PDT: ${pdt}\n` +
                `CDT: ${cdt}\n` +
                `CLT: ${clt}\n` +
                `UTC: ${utc}`,
            );

            return;
        }
    } catch (error) {
        const message = `❌ Error: ${error.message}`;

        if (interaction.deferred || interaction.replied) {
            await interaction.editReply(message);
        } else {
            await interaction.reply({ content: message, ephemeral: true });
        }
    }
});

const youtubeCookie = loadYoutubeCookieString();

if (youtubeCookie) {
    await play.setToken({
        youtube: {
            cookie: youtubeCookie,
        },
    });
    console.log('YouTube cookies loaded');
}

await client.login(config.token);
