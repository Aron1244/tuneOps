<?php

namespace App\Services;

use RuntimeException;
use Symfony\Component\Process\Process;

class PlaylistResolverService
{
    public function __construct(
        protected YouTubeUrlService $youTubeUrl,
    ) {}

    public function extractPlaylistUrls(string $playlistUrl): array
    {
        $playlistId = $this->youTubeUrl->extractPlaylistId($playlistUrl);
        $candidateUrls = array_filter([
            $playlistId ? "https://www.youtube.com/playlist?list={$playlistId}" : null,
            $playlistUrl,
        ]);

        $seen = [];
        $urls = [];

        foreach ($candidateUrls as $targetUrl) {
            foreach ([true, false] as $flatMode) {
                $info = $this->extractInfo($targetUrl, $flatMode);
                $entries = $info['entries'] ?? [];

                if (! is_array($entries)) {
                    continue;
                }

                foreach ($entries as $entry) {
                    if (! is_array($entry)) {
                        continue;
                    }

                    $entryUrl = $entry['webpage_url'] ?? $entry['url'] ?? $entry['id'] ?? null;
                    $normalized = $this->youTubeUrl->normalizeVideoUrl(is_scalar($entryUrl) ? (string) $entryUrl : null);

                    if ($normalized === null || isset($seen[$normalized])) {
                        continue;
                    }

                    $seen[$normalized] = true;
                    $urls[] = $normalized;
                }

                if ($urls !== []) {
                    return $urls;
                }
            }
        }

        return $urls;
    }

    protected function extractInfo(string $url, bool $flatMode): array
    {
        $binary = env('YT_DLP_BIN', 'yt-dlp');
        $command = array_filter([
            $binary,
            '--dump-single-json',
            '--ignore-errors',
            '--no-warnings',
            '--quiet',
            $flatMode ? '--flat-playlist' : null,
            $this->getCookieOption(),
            $url,
        ]);

        $process = new Process(array_values($command));
        $process->setTimeout(120);
        $process->run();

        if ($process->isSuccessful()) {
            $json = trim($process->getOutput());

            if ($json === '') {
                return [];
            }

            $decoded = json_decode($json, true);

            return is_array($decoded) ? $decoded : [];
        }

        $error = trim($process->getErrorOutput());
        if (str_contains(strtolower($error), 'not found') || str_contains(strtolower($error), 'is not recognized')) {
            throw new RuntimeException(
                'yt-dlp no está instalado en el contenedor. Instálalo para resolver playlists automáticamente.',
            );
        }

        return [];
    }

    protected function getCookieOption(): ?string
    {
        $cookiesFile = env('YOUTUBE_COOKIES_FILE');

        if ($cookiesFile && file_exists($cookiesFile)) {
            return '--cookies ' . $cookiesFile;
        }

        return null;
    }
}
