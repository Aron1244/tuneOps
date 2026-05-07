<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GuildPlaybackStateService;
use App\Services\PlaylistCacheService;
use App\Services\PlaylistResolverService;
use App\Services\YouTubeUrlService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class GuildPlaybackController extends Controller
{
    public function snapshot(string $guildId, GuildPlaybackStateService $state): JsonResponse
    {
        return response()->json($state->snapshot($guildId));
    }

    public function enqueue(Request $request, string $guildId, GuildPlaybackStateService $state): JsonResponse
    {
        $validated = $request->validate([
            'item' => ['required', 'array'],
            'front' => ['nullable', 'boolean'],
        ]);

        if (($validated['front'] ?? false) === true) {
            $state->enqueueFront($guildId, $validated['item']);
        } else {
            $state->enqueue($guildId, $validated['item']);
        }

        return response()->json([
            'queue_count' => $state->queueCount($guildId),
        ], 201);
    }

    public function next(string $guildId, GuildPlaybackStateService $state): JsonResponse
    {
        $next = $state->getNextItemConsideringLoop($guildId);
        $state->setCurrent($guildId, $next);

        return response()->json([
            'next' => $next,
            'has_item' => $next !== null,
            'queue_count' => $state->queueCount($guildId),
        ]);
    }

    public function setCurrent(Request $request, string $guildId, GuildPlaybackStateService $state): JsonResponse
    {
        $validated = $request->validate([
            'item' => ['required', 'array'],
        ]);

        $state->setCurrent($guildId, $validated['item']);

        return response()->json([
            'current' => $state->getCurrent($guildId),
        ]);
    }

    public function clearCurrent(string $guildId, GuildPlaybackStateService $state): JsonResponse
    {
        $state->clearCurrent($guildId);

        return response()->json([
            'cleared' => true,
        ]);
    }

    public function clear(string $guildId, GuildPlaybackStateService $state): JsonResponse
    {
        $state->clearPendingUrls($guildId);
        $state->clearQueue($guildId);
        $state->clearCurrent($guildId);

        return response()->json([
            'cleared' => true,
        ]);
    }

    public function removeByTitle(Request $request, string $guildId, GuildPlaybackStateService $state): JsonResponse
    {
        $validated = $request->validate([
            'query' => ['required', 'string', 'min:1'],
        ]);

        $removed = $state->removeFirstByTitle($guildId, $validated['query']);

        return response()->json([
            'removed' => $removed,
            'found' => $removed !== null,
        ]);
    }

    public function pushPendingUrls(Request $request, string $guildId, GuildPlaybackStateService $state): JsonResponse
    {
        $validated = $request->validate([
            'urls' => ['required', 'array', 'min:1'],
            'urls.*' => ['required', 'url'],
            'replace' => ['nullable', 'boolean'],
        ]);

        if (($validated['replace'] ?? false) === true) {
            $state->clearPendingUrls($guildId);
        }

        $state->pushPendingUrls($guildId, $validated['urls']);

        return response()->json([
            'pending_count' => $state->pendingCount($guildId),
        ], 201);
    }

    public function loadPlaylist(
        Request $request,
        string $guildId,
        GuildPlaybackStateService $state,
        YouTubeUrlService $youTubeUrl,
        PlaylistResolverService $resolver,
        PlaylistCacheService $playlistCache,
    ): JsonResponse {
        $validated = $request->validate([
            'url' => ['required', 'string', 'max:5000'],
            'replace_pending' => ['nullable', 'boolean'],
            'ttl_seconds' => ['nullable', 'integer', 'min:60', 'max:86400'],
        ]);

        try {
            $urls = $resolver->extractPlaylistUrls($validated['url']);
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        if ($urls === []) {
            return response()->json([
                'message' => 'No se pudieron extraer canciones de la playlist.',
            ], 422);
        }

        if (($validated['replace_pending'] ?? true) === true) {
            $state->clearPendingUrls($guildId);
        }

        $playlistId = $youTubeUrl->extractPlaylistId($validated['url']);
        if ($playlistId !== null) {
            $playlistCache->store($playlistId, $urls, $validated['ttl_seconds'] ?? null);
        }

        $first = array_shift($urls);
        if (is_string($first) && $first !== '') {
            $state->enqueue($guildId, $youTubeUrl->createPendingItem($first, 1));
        }

        $state->pushPendingUrls($guildId, $urls);

        return response()->json([
            'loaded' => true,
            'playlist_id' => $playlistId,
            'initial_enqueued' => $first !== null,
            'queue_count' => $state->queueCount($guildId),
            'pending_count' => $state->pendingCount($guildId),
            'total_urls' => 1 + count($urls),
        ], 201);
    }

    public function popPendingUrl(string $guildId, GuildPlaybackStateService $state, YouTubeUrlService $youTubeUrl): JsonResponse
    {
        $url = $state->popPendingUrl($guildId);
        if ($url === null) {
            return response()->json([
                'has_item' => false,
                'item' => null,
            ]);
        }

        $index = $state->pendingCount($guildId) + 1;
        $item = $youTubeUrl->createPendingItem($url, $index);

        return response()->json([
            'has_item' => true,
            'url' => $url,
            'item' => $item,
            'pending_count' => $state->pendingCount($guildId),
        ]);
    }

    public function clearPendingUrls(string $guildId, GuildPlaybackStateService $state): JsonResponse
    {
        $state->clearPendingUrls($guildId);

        return response()->json([
            'cleared' => true,
        ]);
    }

    public function enableLoopList(
        string $guildId,
        GuildPlaybackStateService $state,
        YouTubeUrlService $youTubeUrl,
    ): JsonResponse {
        $loopList = $state->buildLoopListSnapshot($guildId, $youTubeUrl);

        if ($loopList === []) {
            return response()->json([
                'message' => 'No hay canciones disponibles para activar loop de lista.',
            ], 422);
        }

        $state->setLoopList($guildId, $loopList);
        $state->setLoopMode($guildId, 'lista');
        $state->setLoopSong($guildId, null);

        return response()->json([
            'enabled' => true,
            'mode' => 'lista',
            'count' => count($loopList),
        ]);
    }

    public function enableLoopSingle(string $guildId, GuildPlaybackStateService $state): JsonResponse
    {
        $current = $state->getCurrent($guildId);

        if ($current === null) {
            return response()->json([
                'message' => 'No hay canción actual para activar loop individual.',
            ], 422);
        }

        $state->setLoopMode($guildId, 'cancion');
        $state->setLoopSong($guildId, $current);

        return response()->json([
            'enabled' => true,
            'mode' => 'cancion',
        ]);
    }

    public function disableLoop(string $guildId, GuildPlaybackStateService $state): JsonResponse
    {
        $state->clearLoopState($guildId);

        return response()->json([
            'enabled' => false,
            'mode' => null,
        ]);
    }
}
