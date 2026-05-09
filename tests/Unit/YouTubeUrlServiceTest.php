<?php

namespace Tests\Unit;

use App\Services\YouTubeUrlService;
use PHPUnit\Framework\TestCase;

class YouTubeUrlServiceTest extends TestCase
{
    public function test_normalize_short_youtube_url(): void
    {
        $service = new YouTubeUrlService;

        $normalized = $service->normalizeYouTubeUrl('https://youtu.be/dQw4w9WgXcQ');

        $this->assertSame('https://www.youtube.com/watch?v=dQw4w9WgXcQ', $normalized);
    }

    public function test_detects_playlist_url_correctly(): void
    {
        $service = new YouTubeUrlService;

        $playlist = $service->isYouTubePlaylistUrl('https://www.youtube.com/playlist?list=PL123');
        $watchWithList = $service->isYouTubePlaylistUrl('https://www.youtube.com/watch?v=abc123&list=PL123');

        $this->assertTrue($playlist);
        $this->assertFalse($watchWithList);
    }

    public function test_extracts_playlist_id_from_url(): void
    {
        $service = new YouTubeUrlService;

        $playlistId = $service->extractPlaylistId('https://www.youtube.com/watch?v=abc123&list=PLXYZ999');

        $this->assertSame('PLXYZ999', $playlistId);
    }

    public function test_normalizes_plain_video_id_to_watch_url(): void
    {
        $service = new YouTubeUrlService;

        $normalized = $service->normalizeVideoUrl('dQw4w9WgXcQ');

        $this->assertSame('https://www.youtube.com/watch?v=dQw4w9WgXcQ', $normalized);
    }
}
