<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

class PlaylistCacheService
{
    public function store(string $playlistId, array $videoUrls, ?int $ttlSeconds = null): array
    {
        $payload = [
            'playlist_id' => $playlistId,
            'video_urls' => array_values($videoUrls),
            'count' => count($videoUrls),
            'cached_at' => now()->toIso8601String(),
        ];

        Cache::put(
            $this->cacheKey($playlistId),
            $payload,
            now()->addSeconds($ttlSeconds ?? (int) env('PLAYLIST_CACHE_TTL', 3600)),
        );

        return $payload;
    }

    public function get(string $playlistId): ?array
    {
        $cached = Cache::get($this->cacheKey($playlistId));

        return is_array($cached) ? $cached : null;
    }

    public function forget(string $playlistId): bool
    {
        return Cache::forget($this->cacheKey($playlistId));
    }

    protected function cacheKey(string $playlistId): string
    {
        return "yt:playlist:{$playlistId}";
    }
}
