<?php

use App\Http\Controllers\ToneController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('tones', [ToneController::class, 'index'])->name('tones.index');
    Route::post('tones', [ToneController::class, 'store'])->name('tones.store');
    Route::put('tones/{tone}', [ToneController::class, 'update'])->name('tones.update');
    Route::delete('tones/{tone}', [ToneController::class, 'destroy'])->name('tones.destroy');
});

require __DIR__.'/settings.php';
