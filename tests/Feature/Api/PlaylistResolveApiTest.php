<?php

namespace Tests\Feature\Api;

use App\Services\PlaylistResolverService;
use App\Services\YouTubeUrlService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlaylistResolveApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_resolves_playlist_and_returns_video_urls(): void
    {
        $this->app->bind(PlaylistResolverService::class, function () {
            return new class(new YouTubeUrlService()) extends PlaylistResolverService
            {
                public function extractPlaylistUrls(string $playlistUrl): array
                {
                    return [
                        'https://www.youtube.com/watch?v=video1',
                        'https://www.youtube.com/watch?v=video2',
                    ];
                }
            };
        });

        $this->postJson('/api/playlists/resolve', [
            'url' => 'https://www.youtube.com/playlist?list=PL_TEST',
        ])
            ->assertOk()
            ->assertJsonPath('is_playlist', true)
            ->assertJsonPath('playlist_id', 'PL_TEST')
            ->assertJsonPath('count', 2);
    }

    public function test_non_playlist_returns_empty_video_list(): void
    {
        $this->postJson('/api/playlists/resolve', [
            'url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ])
            ->assertOk()
            ->assertJsonPath('is_playlist', false)
            ->assertJsonPath('count', 0);
    }
}
