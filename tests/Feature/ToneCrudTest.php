<?php

namespace Tests\Feature;

use App\Models\Tone;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ToneCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_when_visiting_tones_page(): void
    {
        $this->get(route('tones.index'))
            ->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_view_tones_page(): void
    {
        $user = User::factory()->create();
        $tone = Tone::query()->create([
            'name' => 'Intro',
            'tone_key' => 'intro',
            'url' => 'https://www.youtube.com/watch?v=abc123',
        ]);

        $this->actingAs($user)
            ->get(route('tones.index'))
            ->assertOk()
            ->assertSee($tone->name);
    }

    public function test_authenticated_users_can_create_tones(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('tones.store'), [
                'name' => 'Nimu',
                'url' => 'https://www.youtube.com/shorts/gwz3ik9bprs',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('tones', [
            'name' => 'Nimu',
            'tone_key' => 'nimu',
            'url' => 'https://www.youtube.com/shorts/gwz3ik9bprs',
        ]);
    }

    public function test_authenticated_users_can_update_tones(): void
    {
        $user = User::factory()->create();
        $tone = Tone::query()->create([
            'name' => 'Old Name',
            'tone_key' => 'old name',
            'url' => 'https://www.youtube.com/watch?v=old',
        ]);

        $this->actingAs($user)
            ->put(route('tones.update', $tone), [
                'name' => 'New Name',
                'url' => 'https://www.youtube.com/watch?v=new',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('tones', [
            'id' => $tone->id,
            'name' => 'New Name',
            'tone_key' => 'new name',
            'url' => 'https://www.youtube.com/watch?v=new',
        ]);
    }

    public function test_authenticated_users_can_delete_tones(): void
    {
        $user = User::factory()->create();
        $tone = Tone::query()->create([
            'name' => 'Delete Me',
            'tone_key' => 'delete me',
            'url' => 'https://www.youtube.com/watch?v=delete',
        ]);

        $this->actingAs($user)
            ->delete(route('tones.destroy', $tone))
            ->assertRedirect();

        $this->assertDatabaseMissing('tones', [
            'id' => $tone->id,
        ]);
    }

    public function test_name_must_be_unique_ignoring_case(): void
    {
        $user = User::factory()->create();
        Tone::query()->create([
            'name' => 'Intro',
            'tone_key' => 'intro',
            'url' => 'https://www.youtube.com/watch?v=original',
        ]);

        $this->actingAs($user)
            ->from(route('tones.index'))
            ->post(route('tones.store'), [
                'name' => 'INTRO',
                'url' => 'https://www.youtube.com/watch?v=duplicate',
            ])
            ->assertRedirect(route('tones.index'))
            ->assertSessionHasErrors('name');
    }
}
