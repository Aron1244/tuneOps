<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ToneApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_store_and_fetch_tone(): void
    {
        $this->postJson('/api/tones', [
            'name' => 'intro',
            'url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ])->assertCreated()
            ->assertJsonPath('name', 'intro');

        $this->getJson('/api/tones?name=intro')
            ->assertOk()
            ->assertJsonPath('name', 'intro')
            ->assertJsonPath('url', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    }

    public function test_storing_existing_tone_updates_url(): void
    {
        $this->postJson('/api/tones', [
            'name' => 'Intro',
            'url' => 'https://www.youtube.com/watch?v=aaaa',
        ])->assertCreated();

        $this->postJson('/api/tones', [
            'name' => 'intro',
            'url' => 'https://www.youtube.com/watch?v=bbbb',
        ])->assertOk()
            ->assertJsonPath('created', false);

        $this->getJson('/api/tones?name=INTRO')
            ->assertOk()
            ->assertJsonPath('name', 'intro')
            ->assertJsonPath('url', 'https://www.youtube.com/watch?v=bbbb');
    }

    public function test_returns_not_found_for_unknown_tone(): void
    {
        $this->getJson('/api/tones?name=no-existe')
            ->assertNotFound();
    }
}
