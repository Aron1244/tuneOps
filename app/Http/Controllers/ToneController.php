<?php

namespace App\Http\Controllers;

use App\Models\Tone;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ToneController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('tones/index', [
            'tones' => Tone::query()
                ->orderBy('name')
                ->get(['id', 'name', 'url', 'created_at', 'updated_at']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateTonePayload($request);

        Tone::query()->create([
            'name' => $validated['name'],
            'tone_key' => $validated['tone_key'],
            'url' => $validated['url'],
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Tono creado.']);

        return back();
    }

    public function update(Request $request, Tone $tone): RedirectResponse
    {
        $validated = $this->validateTonePayload($request, $tone);

        $tone->update([
            'name' => $validated['name'],
            'tone_key' => $validated['tone_key'],
            'url' => $validated['url'],
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Tono actualizado.']);

        return back();
    }

    public function destroy(Tone $tone): RedirectResponse
    {
        $tone->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Tono eliminado.']);

        return back();
    }

    /**
     * @return array{name: string, tone_key: string, url: string}
     */
    private function validateTonePayload(Request $request, ?Tone $tone = null): array
    {
        $payload = [
            'name' => trim((string) $request->input('name')),
            'url' => (string) $request->input('url'),
        ];

        /** @var array{name: string, url: string, tone_key?: string} $validated */
        $validated = validator($payload, [
            'name' => ['required', 'string', 'min:1', 'max:100'],
            'url' => ['required', 'url', 'max:2048'],
        ])->validate();

        $validated['tone_key'] = $this->normalizeKey($validated['name']);

        $toneKeyAlreadyExists = Tone::query()
            ->where('tone_key', $validated['tone_key'])
            ->when($tone !== null, fn ($query) => $query->whereKeyNot($tone->id))
            ->exists();

        if ($toneKeyAlreadyExists) {
            throw ValidationException::withMessages([
                'name' => 'Ya existe un tono con ese nombre.',
            ]);
        }

        return $validated;
    }

    private function normalizeKey(string $name): string
    {
        return mb_strtolower(trim($name));
    }
}
