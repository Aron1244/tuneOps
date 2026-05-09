<?php

use App\Http\Controllers\Api\GuildPlaybackController;
use App\Http\Controllers\Api\PlaylistCacheController;
use App\Http\Controllers\Api\PlaylistResolveController;
use App\Http\Controllers\Api\ToneController;
use Illuminate\Support\Facades\Route;

Route::get('/test', fn () => response()->json(['test' => 'ok']));

Route::post('/debug', function () {
    $input = file_get_contents('php://input');
    $json = json_decode($input, true);

    return response()->json([
        'raw_input' => $input,
        'json_decoded' => $json,
        'request_all' => request()->all(),
    ]);
});

Route::prefix('playlists/{playlistId}/cache')
    ->where(['playlistId' => '[A-Za-z0-9_-]+'])
    ->group(function () {
        Route::get('/', [PlaylistCacheController::class, 'show'])->name('api.playlists.cache.show');
        Route::put('/', [PlaylistCacheController::class, 'store'])->name('api.playlists.cache.store');
        Route::delete('/', [PlaylistCacheController::class, 'destroy'])->name('api.playlists.cache.destroy');
    });

Route::post('/playlists/resolve', [PlaylistResolveController::class, 'resolve'])
    ->name('api.playlists.resolve');

Route::post('/tones', [ToneController::class, 'store'])->name('api.tones.store');
Route::get('/tones', [ToneController::class, 'find'])->name('api.tones.find');
Route::get('/tones/list', [ToneController::class, 'index'])->name('api.tones.index');
Route::get('/tones/{name}', [ToneController::class, 'show'])->name('api.tones.show');

Route::prefix('guilds/{guildId}')
    ->where(['guildId' => '[0-9]+'])
    ->group(function () {
        Route::get('/playback', [GuildPlaybackController::class, 'snapshot'])->name('api.guilds.playback.snapshot');
        Route::post('/playlists/load', [GuildPlaybackController::class, 'loadPlaylist'])->name('api.guilds.playlists.load');
        Route::post('/queue/items', [GuildPlaybackController::class, 'enqueue'])->name('api.guilds.queue.enqueue');
        Route::post('/queue/next', [GuildPlaybackController::class, 'next'])->name('api.guilds.queue.next');
        Route::delete('/queue', [GuildPlaybackController::class, 'clear'])->name('api.guilds.queue.clear');
        Route::delete('/queue/items/match', [GuildPlaybackController::class, 'removeByTitle'])->name('api.guilds.queue.remove');
        Route::put('/current', [GuildPlaybackController::class, 'setCurrent'])->name('api.guilds.current.set');
        Route::delete('/current', [GuildPlaybackController::class, 'clearCurrent'])->name('api.guilds.current.clear');

        Route::post('/pending-urls', [GuildPlaybackController::class, 'pushPendingUrls'])->name('api.guilds.pending.push');
        Route::post('/pending-urls/pop', [GuildPlaybackController::class, 'popPendingUrl'])->name('api.guilds.pending.pop');
        Route::delete('/pending-urls', [GuildPlaybackController::class, 'clearPendingUrls'])->name('api.guilds.pending.clear');

        Route::post('/loop/list', [GuildPlaybackController::class, 'enableLoopList'])->name('api.guilds.loop.list');
        Route::post('/loop/single', [GuildPlaybackController::class, 'enableLoopSingle'])->name('api.guilds.loop.single');
        Route::delete('/loop', [GuildPlaybackController::class, 'disableLoop'])->name('api.guilds.loop.disable');
    });
