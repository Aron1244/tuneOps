<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ToneController extends Controller
{
    public function index(): JsonResponse
    {
        $tones = Tone::query()
            ->orderBy('name')
            ->get(['id', 'name', 'url']);

        return response()->json(['tones' => $tones]);
    }

    public function find(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:1', 'max:100'],
        ]);

        return $this->findByName($validated['name']);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:1', 'max:100'],
            'url' => ['required', 'url', 'max:2048'],
        ]);

        $tone = Tone::query()->updateOrCreate(
            ['tone_key' => $this->normalizeKey($validated['name'])],
            [
                'name' => trim($validated['name']),
                'url' => $validated['url'],
            ],
        );

        return response()->json([
            'id' => $tone->id,
            'name' => $tone->name,
            'url' => $tone->url,
            'created' => $tone->wasRecentlyCreated,
        ], $tone->wasRecentlyCreated ? 201 : 200);
    }

    public function show(string $name): JsonResponse
    {
        return $this->findByName($name);
    }

    public function destroy(Request $request): JsonResponse
    {
        $name = $request->query('name');

        if (! $name) {
            return response()->json(['message' => 'El parámetro name es requerido.'], 422);
        }

        $toneKey = $this->normalizeKey($name);
        $tone = Tone::query()->where('tone_key', $toneKey)->first();

        if (! $tone) {
            return response()->json(['message' => 'Tono no encontrado.'], 404);
        }

        $tone->delete();

        return response()->json(['deleted' => true, 'name' => $tone->name]);
    }

    private function findByName(string $name): JsonResponse
    {
        $tone = Tone::query()
            ->where('tone_key', $this->normalizeKey($name))
            ->first();

        if ($tone === null) {
            return response()->json([
                'message' => 'Tono no encontrado.',
            ], 404);
        }

        return response()->json([
            'id' => $tone->id,
            'name' => $tone->name,
            'url' => $tone->url,
        ]);
    }

    private function normalizeKey(string $name): string
    {
        return mb_strtolower(trim($name));
    }
}
