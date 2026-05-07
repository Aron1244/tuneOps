<?php

namespace App\Services;

use Illuminate\Support\Facades\Redis;

class GuildPlaybackStateService
{
    public function enqueue(string|int $guildId, array $item): void
    {
        Redis::rpush($this->queueKey($guildId), [json_encode($item, JSON_UNESCAPED_UNICODE)]);
    }

    public function enqueueFront(string|int $guildId, array $item): void
    {
        Redis::lpush($this->queueKey($guildId), [json_encode($item, JSON_UNESCAPED_UNICODE)]);
    }

    public function dequeue(string|int $guildId): ?array
    {
        $raw = Redis::lpop($this->queueKey($guildId));

        return $this->decodePayload($raw);
    }

    public function peekQueue(string|int $guildId): array
    {
        $rawItems = Redis::lrange($this->queueKey($guildId), 0, -1);

        return $this->decodeList($rawItems);
    }

    public function queueCount(string|int $guildId): int
    {
        return (int) Redis::llen($this->queueKey($guildId));
    }

    public function clearQueue(string|int $guildId): void
    {
        Redis::del($this->queueKey($guildId));
    }

    public function removeFirstByTitle(string|int $guildId, string $query): ?array
    {
        $needle = mb_strtolower(trim($query));
        $items = $this->peekQueue($guildId);

        if ($needle === '' || $items === []) {
            return null;
        }

        $removed = null;
        $kept = [];

        foreach ($items as $item) {
            $title = mb_strtolower((string) ($item['titulo'] ?? ''));

            if ($removed === null && str_contains($title, $needle)) {
                $removed = $item;

                continue;
            }

            $kept[] = $item;
        }

        if ($removed === null) {
            return null;
        }

        $this->clearQueue($guildId);
        foreach ($kept as $item) {
            $this->enqueue($guildId, $item);
        }

        return $removed;
    }

    public function setCurrent(string|int $guildId, ?array $item): void
    {
        if ($item === null) {
            Redis::del($this->currentKey($guildId));

            return;
        }

        Redis::set($this->currentKey($guildId), json_encode($item, JSON_UNESCAPED_UNICODE));
    }

    public function getCurrent(string|int $guildId): ?array
    {
        return $this->decodePayload(Redis::get($this->currentKey($guildId)));
    }

    public function clearCurrent(string|int $guildId): void
    {
        Redis::del($this->currentKey($guildId));
    }

    public function pushPendingUrls(string|int $guildId, array $urls): void
    {
        $normalized = array_values(array_filter(array_map(
            fn ($url) => is_string($url) ? trim($url) : '',
            $urls,
        )));

        if ($normalized === []) {
            return;
        }

        Redis::rpush($this->pendingUrlsKey($guildId), $normalized);
    }

    public function popPendingUrl(string|int $guildId): ?string
    {
        $url = Redis::lpop($this->pendingUrlsKey($guildId));

        return is_string($url) && $url !== '' ? $url : null;
    }

    public function peekPendingUrls(string|int $guildId): array
    {
        $raw = Redis::lrange($this->pendingUrlsKey($guildId), 0, -1);

        return array_values(array_filter($raw, fn ($url) => is_string($url) && $url !== ''));
    }

    public function pendingCount(string|int $guildId): int
    {
        return (int) Redis::llen($this->pendingUrlsKey($guildId));
    }

    public function clearPendingUrls(string|int $guildId): void
    {
        Redis::del($this->pendingUrlsKey($guildId));
    }

    public function setLoopMode(string|int $guildId, ?string $mode): void
    {
        if (! in_array($mode, ['lista', 'cancion', null], true)) {
            return;
        }

        if ($mode === null) {
            Redis::del($this->loopModeKey($guildId));

            return;
        }

        Redis::set($this->loopModeKey($guildId), $mode);
    }

    public function getLoopMode(string|int $guildId): ?string
    {
        $mode = Redis::get($this->loopModeKey($guildId));

        return in_array($mode, ['lista', 'cancion'], true) ? $mode : null;
    }

    public function setLoopSong(string|int $guildId, ?array $item): void
    {
        if ($item === null) {
            Redis::del($this->loopSongKey($guildId));

            return;
        }

        Redis::set($this->loopSongKey($guildId), json_encode($item, JSON_UNESCAPED_UNICODE));
    }

    public function getLoopSong(string|int $guildId): ?array
    {
        return $this->decodePayload(Redis::get($this->loopSongKey($guildId)));
    }

    public function setLoopList(string|int $guildId, array $items): void
    {
        Redis::del($this->loopListKey($guildId));
        foreach ($items as $item) {
            if (is_array($item)) {
                Redis::rpush($this->loopListKey($guildId), [json_encode($item, JSON_UNESCAPED_UNICODE)]);
            }
        }
    }

    public function getLoopList(string|int $guildId): array
    {
        return $this->decodeList(Redis::lrange($this->loopListKey($guildId), 0, -1));
    }

    public function clearLoopState(string|int $guildId): void
    {
        Redis::del(
            $this->loopModeKey($guildId),
            $this->loopListKey($guildId),
            $this->loopSongKey($guildId),
        );
    }

    public function getNextItemConsideringLoop(string|int $guildId): ?array
    {
        if ($this->queueCount($guildId) === 0) {
            $mode = $this->getLoopMode($guildId);

            if ($mode === 'lista') {
                foreach ($this->getLoopList($guildId) as $item) {
                    $this->enqueue($guildId, $item);
                }
            } elseif ($mode === 'cancion') {
                $song = $this->getLoopSong($guildId);

                if ($song !== null) {
                    $this->enqueue($guildId, $song);
                }
            }
        }

        return $this->dequeue($guildId);
    }

    public function buildLoopListSnapshot(string|int $guildId, YouTubeUrlService $youTubeUrl): array
    {
        $items = [];

        $current = $this->getCurrent($guildId);
        if ($current !== null) {
            $items[] = $current;
        }

        $items = [...$items, ...$this->peekQueue($guildId)];

        foreach ($this->peekPendingUrls($guildId) as $index => $url) {
            $items[] = $youTubeUrl->createPendingItem($url, $index + 1);
        }

        return $items;
    }

    public function snapshot(string|int $guildId): array
    {
        return [
            'current' => $this->getCurrent($guildId),
            'queue' => $this->peekQueue($guildId),
            'queue_count' => $this->queueCount($guildId),
            'pending_urls' => $this->peekPendingUrls($guildId),
            'pending_count' => $this->pendingCount($guildId),
            'loop_mode' => $this->getLoopMode($guildId),
            'loop_list_count' => count($this->getLoopList($guildId)),
        ];
    }

    protected function decodeList(array $rawItems): array
    {
        return array_values(array_filter(array_map(
            fn ($raw) => $this->decodePayload($raw),
            $rawItems,
        )));
    }

    protected function decodePayload(mixed $raw): ?array
    {
        if (! is_string($raw) || $raw === '') {
            return null;
        }

        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : null;
    }

    protected function queueKey(string|int $guildId): string
    {
        return "bot:guild:{$guildId}:queue";
    }

    protected function currentKey(string|int $guildId): string
    {
        return "bot:guild:{$guildId}:current";
    }

    protected function pendingUrlsKey(string|int $guildId): string
    {
        return "bot:guild:{$guildId}:pending_urls";
    }

    protected function loopModeKey(string|int $guildId): string
    {
        return "bot:guild:{$guildId}:loop_mode";
    }

    protected function loopListKey(string|int $guildId): string
    {
        return "bot:guild:{$guildId}:loop_list";
    }

    protected function loopSongKey(string|int $guildId): string
    {
        return "bot:guild:{$guildId}:loop_song";
    }
}
