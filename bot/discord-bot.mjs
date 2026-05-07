import 'dotenv/config';
import fs from 'node:fs';

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
    // eslint-disable-next-line no-console
    console.error('unhandledRejection:', reason);
});

process.on('uncaughtException', (error) => {
    // eslint-disable-next-line no-console
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

    const cookieFile = process.env.YOUTUBE_COOKIES_FILE || '/app/cookies.txt';
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

if (!config.token || !config.clientId) {
    throw new Error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in environment.');
}

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

const voiceState = new Map();

const commands = [
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
    new SlashCommandBuilder().setName('noloop').setDescription('Desactiva cualquier loop'),
];

function apiUrl(path) {
    return `${config.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

async function apiRequest(path, { method = 'GET', body } = {}) {
    const response = await fetch(apiUrl(path), {
        method,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    const json = text ? JSON.parse(text) : {};

    if (!response.ok) {
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

        voiceState.set(guildId, {
            player,
            connection: null,
            textChannelId: null,
            currentTitle: null,
        });

        player.on('error', (error) => {
            // eslint-disable-next-line no-console
            console.error(`audio player error [${guildId}]:`, error.message);
        });
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
    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);

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

    const [result] = await play.search(trimmed, {
        source: { youtube: 'video' },
        limit: 1,
    });

    if (!result?.url) {
        throw new Error('No se encontró ningún video para esa búsqueda.');
    }

    return {
        url: result.url,
        title: result.title || trimmed,
    };
}

async function playNext(guildId) {
    const runtime = getGuildRuntime(guildId);
    if (!runtime.connection) {
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

    let title = item.titulo || item.title || sourceUrl;

    try {
        const stream = await play.stream(sourceUrl, {
            quality: 2,
            discordPlayerCompatibility: true,
        });

        const resource = createAudioResource(stream.stream, {
            inputType: stream.type,
            inlineVolume: false,
        });

        runtime.currentTitle = title;
        runtime.player.play(resource);
    } catch (error) {
        try {
            const details = await play.video_basic_info(sourceUrl);
            title = details.video_details.title || title;
        } catch {
            // ignore metadata lookup failures
        }

        await apiRequest(`/guilds/${guildId}/queue/items`, {
            method: 'POST',
            body: { item: { tipo: 'youtube_pendiente', url: sourceUrl, titulo: title }, front: true },
        });
        await apiRequest(`/guilds/${guildId}/current`, { method: 'DELETE' });
        await notifyGuild(guildId, `❌ No pude reproducir **${title}**: ${error.message}`);
    }
}

async function startPlaybackIfIdle(guildId) {
    const runtime = getGuildRuntime(guildId);

    if (runtime.player.state.status !== AudioPlayerStatus.Playing) {
        await playNext(guildId);
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

    // eslint-disable-next-line no-console
    console.log(`Discord bot conectado como ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand() || !interaction.guildId) {
        return;
    }

    const guildId = interaction.guildId;
    const runtime = getGuildRuntime(guildId);
    runtime.textChannelId = interaction.channelId;

    if (!runtime.player.listenerCount(AudioPlayerStatus.Idle)) {
        runtime.player.on(AudioPlayerStatus.Idle, async () => {
            try {
                await playNext(guildId);
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('playNext error:', error.message);
            }
        });
    }

    try {
        if (interaction.commandName === 'play') {
            const input = interaction.options.getString('input', true);
            await interaction.deferReply();
            await ensureVoiceConnection(interaction);

            const isPlaylist = /^https?:\/\/.*[?&]list=/i.test(input);

            if (isPlaylist) {
                const result = await apiRequest(`/guilds/${guildId}/playlists/load`, {
                    method: 'POST',
                    body: { url: input, replace_pending: false },
                });

                await startPlaybackIfIdle(guildId);
                await interaction.editReply(
                    `📦 Playlist cargada. Cola: ${result.queue_count}, pendientes: ${result.pending_count}`,
                );

                return;
            }

            const track = await resolveTrack(input);
            await apiRequest(`/guilds/${guildId}/queue/items`, {
                method: 'POST',
                body: { item: { tipo: 'youtube_pendiente', url: track.url, titulo: track.title } },
            });

            await startPlaybackIfIdle(guildId);
            await interaction.editReply(`📝 Añadido a la cola: **${track.title}**`);

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
            await interaction.reply(
                [
                    '📜 **Comandos**',
                    '/play, /skip, /eliminar, /limpiar, /lista, /comandos',
                    '/debugvoz, /pahora, /last, /stop, /leave',
                    '/looplist, /loopsingle, /noloop',
                ].join('\n'),
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
}

await client.login(config.token);
