<?php

namespace App\Services;

use Illuminate\Support\Str;

class YouTubeUrlService
{
    public function normalizeYouTubeUrl(?string $urlText): string
    {
        $text = trim((string) $urlText);

        if (! Str::startsWith($text, ['http://', 'https://'])) {
            return $text;
        }

        $parts = parse_url($text);
        if (! is_array($parts)) {
            return $text;
        }

        $host = strtolower((string) ($parts['host'] ?? ''));
        $path = (string) ($parts['path'] ?? '');
        parse_str((string) ($parts['query'] ?? ''), $query);

        if (str_contains($host, 'youtu.be')) {
            $videoId = trim($path, '/');

            return $videoId !== '' ? "https://www.youtube.com/watch?v={$videoId}" : $text;
        }

        if (str_contains($host, 'youtube.com') && $path === '/watch') {
            $videoId = (string) ($query['v'] ?? '');

            return $videoId !== '' ? "https://www.youtube.com/watch?v={$videoId}" : $text;
        }

        return $text;
    }

    public function isYouTubePlaylistUrl(?string $urlText): bool
    {
        $text = trim((string) $urlText);

        if (! Str::startsWith($text, ['http://', 'https://'])) {
            return false;
        }

        $parts = parse_url($text);
        if (! is_array($parts)) {
            return false;
        }

        $host = strtolower((string) ($parts['host'] ?? ''));
        if (! str_contains($host, 'youtube.com') && ! str_contains($host, 'youtu.be')) {
            return false;
        }

        $path = strtolower((string) ($parts['path'] ?? ''));
        parse_str((string) ($parts['query'] ?? ''), $query);
        $playlistId = (string) ($query['list'] ?? '');

        if ($playlistId === '') {
            return false;
        }

        if ($path === '/playlist') {
            return true;
        }

        if ($path === '/watch' && filled($query['v'] ?? null)) {
            return false;
        }

        return true;
    }

    public function extractPlaylistId(?string $urlText): ?string
    {
        $text = trim((string) $urlText);
        if ($text === '') {
            return null;
        }

        $parts = parse_url($text);
        if (is_array($parts)) {
            parse_str((string) ($parts['query'] ?? ''), $query);
            $playlistId = (string) ($query['list'] ?? '');

            if ($playlistId !== '') {
                return $playlistId;
            }
        }

        if (preg_match('/(?:[?&]|\?)list=([^&\s>]+)/', $text, $matches) === 1) {
            return $matches[1];
        }

        return null;
    }

    public function normalizeVideoUrl(?string $urlText): ?string
    {
        $text = trim((string) $urlText);
        if ($text === '') {
            return null;
        }

        if (Str::startsWith($text, '/')) {
            $text = "https://www.youtube.com{$text}";
        }

        if (Str::startsWith($text, ['http://', 'https://'])) {
            return $this->normalizeYouTubeUrl($text);
        }

        return "https://www.youtube.com/watch?v={$text}";
    }

    public function buildPendingTitle(string $videoUrl, int $index): string
    {
        $parts = parse_url($videoUrl);
        if (! is_array($parts)) {
            return "YouTube {$index}";
        }

        parse_str((string) ($parts['query'] ?? ''), $query);
        $videoId = (string) ($query['v'] ?? '');

        if ($videoId === '') {
            return "YouTube {$index}";
        }

        return "YouTube {$index}: {$videoId}";
    }

    public function createPendingItem(string $videoUrl, int $index): array
    {
        return [
            'tipo' => 'youtube_pendiente',
            'url' => $videoUrl,
            'titulo' => $this->buildPendingTitle($videoUrl, $index),
        ];
    }
}
