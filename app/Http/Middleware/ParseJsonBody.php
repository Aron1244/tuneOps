<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ParseJsonBody
{
    public function handle(Request $request, Closure $next)
    {
        if (in_array($request->method(), ['POST', 'PUT', 'PATCH'])) {
            $content = $request->getContent();
            if ($content && $request->header('Content-Type') === 'application/json') {
                $data = json_decode($content, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($data)) {
                    $request->merge($data);
                }
            }
        }

        return $next($request);
    }
}