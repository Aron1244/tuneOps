<?php

namespace Tests\Feature\Api;

use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class PlaylistCacheApiTest extends TestCase
{
    public function test_can_store_and_fetch_playlist_cache(): void
    {
        $playlistId = 'PL123ABC';

        $this->putJson("/api/playlists/{$playlistId}/cache", [
            'video_urls' => [
                'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                'https://www.youtube.com/watch?v=9bZkp7q19f0',
            ],
            'ttl_seconds' => 120,
        ])->assertCreated();

        $this->getJson("/api/playlists/{$playlistId}/cache")
            ->assertOk()
            ->assertJsonPath('playlist_id', $playlistId)
            ->assertJsonPath('count', 2);
    }

    public function test_returns_not_found_when_cache_does_not_exist(): void
    {
        $this->getJson('/api/playlists/PL_NOT_FOUND/cache')
            ->assertNotFound();
    }

    public function test_can_delete_playlist_cache(): void
    {
        $playlistId = 'PL_REMOVE';

        Cache::put("yt:playlist:{$playlistId}", [
            'playlist_id' => $playlistId,
            'video_urls' => ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
            'count' => 1,
            'cached_at' => now()->toIso8601String(),
        ], now()->addMinutes(5));

        $this->deleteJson("/api/playlists/{$playlistId}/cache")
            ->assertOk()
            ->assertJsonPath('removed', true);

        $this->getJson("/api/playlists/{$playlistId}/cache")
            ->assertNotFound();
    }
}
