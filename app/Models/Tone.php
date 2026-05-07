<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tone extends Model
{
    protected $fillable = [
        'name',
        'tone_key',
        'url',
    ];
}
