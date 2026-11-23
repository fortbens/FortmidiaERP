<?php
declare(strict_types=1);

/**
 * Configuração do Servidor PHP — CRM FortMídia & Portal FortNews
 *
 * IMPORTANTE:
 * 1. Renomeie este arquivo para `config.php` no servidor (ou armazene fora da `public_html/`).
 * 2. NUNCA envie `config.php` com credenciais reais para o GitHub.
 * 3. O arquivo `api/.htaccess` bloqueia acesso HTTP direto a arquivos de configuração.
 */

return [
    'db_host' => getenv('DB_HOST') ?: 'localhost',
    'db_port' => getenv('DB_PORT') ?: '3306',
    'db_name' => getenv('DB_NAME') ?: 'seu_usuario_fortmidia_db',
    'db_user' => getenv('DB_USER') ?: 'seu_usuario_mysql',
    'db_pass' => getenv('DB_PASS') ?: '',

    // Chave secreta lida exclusivamente no servidor PHP (nunca exposta ao navegador)
    'gemini_api_key' => getenv('GEMINI_API_KEY') ?: '',

    // Opcional: chave pública do Google Maps (restrita por domínio no Google Cloud Console)
    'google_maps_api_key' => getenv('GOOGLE_MAPS_API_KEY') ?: '',

    // Domínios autorizados para CORS
    'allowed_origins' => [
        'https://fortmidia.com.br',
        'https://www.fortmidia.com.br',
        'https://fortnews.com.br',
        'https://www.fortnews.com.br',
        'https://jornalfortnews.com.br',
        'https://www.jornalfortnews.com.br',
    ],

    // Duração do token Bearer em horas
    'session_ttl_hours' => 24,
];
