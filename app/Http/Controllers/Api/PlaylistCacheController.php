<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PlaylistCacheService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlaylistCacheController extends Controller
{
    public function show(PlaylistCacheService $playlistCache, string $playlistId): JsonResponse
    {
        $payload = $playlistCache->get($playlistId);

        if ($payload === null) {
            return response()->json([
                'message' => 'Playlist cache not found.',
            ], 404);
        }

        return response()->json($payload);
    }

    public function store(Request $request, PlaylistCacheService $playlistCache, string $playlistId): JsonResponse
    {
        $validated = $request->validate([
            'video_urls' => ['required', 'array', 'min:1'],
            'video_urls.*' => ['required', 'url'],
            'ttl_seconds' => ['nullable', 'integer', 'min:60', 'max:86400'],
        ]);

        $payload = $playlistCache->store(
            playlistId: $playlistId,
            videoUrls: $validated['video_urls'],
            ttlSeconds: $validated['ttl_seconds'] ?? null,
        );

        return response()->json($payload, 201);
    }

    public function destroy(PlaylistCacheService $playlistCache, string $playlistId): JsonResponse
    {
        $removed = $playlistCache->forget($playlistId);

        return response()->json([
            'removed' => $removed,
        ]);
    }
}
