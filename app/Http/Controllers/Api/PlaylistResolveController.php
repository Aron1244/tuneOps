<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PlaylistCacheService;
use App\Services\PlaylistResolverService;
use App\Services\YouTubeUrlService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class PlaylistResolveController extends Controller
{
    public function resolve(
        Request $request,
        YouTubeUrlService $youTubeUrl,
        PlaylistResolverService $resolver,
        PlaylistCacheService $playlistCache,
    ): JsonResponse {
        $validated = $request->validate([
            'url' => ['required', 'string', 'max:5000'],
            'ttl_seconds' => ['nullable', 'integer', 'min:60', 'max:86400'],
        ]);

        $url = trim($validated['url']);
        $playlistId = $youTubeUrl->extractPlaylistId($url);
        $isPlaylist = $youTubeUrl->isYouTubePlaylistUrl($url) || $playlistId !== null;

        if (! $isPlaylist) {
            return response()->json([
                'url' => $youTubeUrl->normalizeYouTubeUrl($url),
                'is_playlist' => false,
                'playlist_id' => null,
                'video_urls' => [],
                'count' => 0,
            ]);
        }

        try {
            $videoUrls = $resolver->extractPlaylistUrls($url);
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        if ($playlistId !== null && $videoUrls !== []) {
            $playlistCache->store($playlistId, $videoUrls, $validated['ttl_seconds'] ?? null);
        }

        return response()->json([
            'url' => $url,
            'is_playlist' => true,
            'playlist_id' => $playlistId,
            'video_urls' => $videoUrls,
            'count' => count($videoUrls),
            'cached' => $playlistId !== null && $videoUrls !== [],
        ]);
    }
}
