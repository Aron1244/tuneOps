<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
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
            $info = $this->extractInfo($targetUrl, true);
            
            // Handle both old format (with 'entries') and new format (array of URLs)
            $entries = $info;
            
            foreach ($entries as $entry) {
                // If it's a string, use it directly as URL
                if (is_string($entry)) {
                    $entryUrl = $entry;
                } elseif (is_array($entry)) {
                    $entryUrl = $entry['webpage_url'] ?? $entry['url'] ?? $entry['id'] ?? null;
                } else {
                    continue;
                }
                
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

        return $urls;
    }

protected function extractInfo(string $url, bool $flatMode): array
    {
        $binary = env('YT_DLP_BIN', 'yt-dlp');
        $command = array_filter([
            $binary,
            '--flat-playlist',
            '--print', '%(url)s',
            '--ignore-errors',
            '--no-warnings',
            '--no-download',
            $this->getCookieOption(),
            $url,
        ]);

        $process = new Process(array_values($command));
        $process->setTimeout(120);
        $process->run();

        if ($process->isSuccessful()) {
            $output = trim($process->getOutput());
        } else {
            $error = trim($process->getErrorOutput());
            if (str_contains(strtolower($error), 'not found')) {
                throw new RuntimeException('yt-dlp no está instalado.');
            }
            return [];
        }

        if ($output === '') {
            return [];
        }

        // Each line is a URL
        $lines = explode("\n", $output);
        $urls = [];
        
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line && str_starts_with($line, 'http')) {
                $urls[] = [
                    'url' => $line,
                    'webpage_url' => $line,
                ];
            }
        }
        
        return $urls;
    }

            // Each line is a URL
            $lines = explode("\n", $output);
            $urls = [];
            
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line && filter_var($line, FILTER_VALIDATE_URL)) {
                    $urls[] = [
                        'url' => $line,
                        'webpage_url' => $line,
                    ];
                }
            }
            
            return $urls;
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
        $cookiesFile = config('app.youtube_cookies_file') ?: base_path('../cookies.txt');

        if ($cookiesFile && file_exists($cookiesFile)) {
            return '--cookies ' . $cookiesFile;
        }

        return null;
    }
}
