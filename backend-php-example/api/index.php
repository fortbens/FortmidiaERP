<?php
declare(strict_types=1);

/**
 * REST API PHP 8+ com PDO MySQL — CRM FortMídia & Portal FortNews (cPanel / HomeHost)
 *
 * Recursos:
 * - Conexão PDO segura com prepared statements nativos (ATTR_EMULATE_PREPARES = false)
 * - Autenticação por Bearer Token armazenado como hash SHA-256 na tabela `user_sessions`
 * - Senhas armazenadas exclusivamente com password_hash (bcrypt)
 * - CORS restrito a fortmidia.com.br, fortnews.com.br e jornalfortnews.com.br
 * - Proxy /api/ai lendo GEMINI_API_KEY apenas no servidor
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$configPath = __DIR__ . '/config.php';
$config = file_exists($configPath)
    ? require $configPath
    : require __DIR__ . '/config.example.php';

// ----------------------------------------------------------------------------
// 1. CORS Restrito (Sem wildcard em rotas autenticadas)
// ----------------------------------------------------------------------------
$allowedOrigins = $config['allowed_origins'] ?? [
    'https://fortmidia.com.br',
    'https://www.fortmidia.com.br',
    'https://fortnews.com.br',
    'https://www.fortnews.com.br',
    'https://jornalfortnews.com.br',
    'https://www.jornalfortnews.com.br',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept');
    header('Access-Control-Max-Age: 86400');
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ----------------------------------------------------------------------------
// 2. Utilitários de Resposta, Entrada & PDO
// ----------------------------------------------------------------------------
function jsonResponse(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function readJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function getPdo(array $config): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        $config['db_host'] ?? 'localhost',
        $config['db_port'] ?? '3306',
        $config['db_name'] ?? ''
    );

    try {
        $pdo = new PDO(
            $dsn,
            (string) ($config['db_user'] ?? ''),
            (string) ($config['db_pass'] ?? ''),
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
        return $pdo;
    } catch (Throwable) {
        jsonResponse(503, ['error' => 'Não foi possível conectar ao banco de dados MySQL.']);
    }
}

function extractBearerToken(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? '';
    if ($header === '' && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        foreach ($headers as $key => $val) {
            if (strtolower((string) $key) === 'authorization') {
                $header = (string) $val;
                break;
            }
        }
    }
    if (preg_match('/^Bearer\s+([A-Za-z0-9._\-]{20,256})$/i', trim($header), $matches)) {
        return $matches[1];
    }
    return null;
}

function getAuthenticatedUser(PDO $pdo): ?array
{
    $token = extractBearerToken();
    if ($token === null) {
        return null;
    }

    $tokenHash = hash('sha256', $token);
    $stmt = $pdo->prepare(
        'SELECT u.id, u.name, u.role, u.hierarchy_level, u.department, u.email, u.phone,
                u.avatar_url, u.bio, u.linked_client_name, u.allowed_modules_json,
                u.permissions_json, u.active
           FROM user_sessions s
           INNER JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = :token_hash
            AND s.expires_at > NOW()
            AND u.active = 1
          LIMIT 1'
    );
    $stmt->execute([':token_hash' => $tokenHash]);
    $user = $stmt->fetch();
    if (!$user) {
        return null;
    }

    return formatUserRow($user);
}

function requireAuth(PDO $pdo): array
{
    $user = getAuthenticatedUser($pdo);
    if ($user === null) {
        jsonResponse(401, ['error' => 'Autenticação obrigatória. Faça login novamente.']);
    }
    return $user;
}

function requireAdmin(PDO $pdo): array
{
    $user = requireAuth($pdo);
    if ((int) ($user['hierarchyLevel'] ?? 99) > 2) {
        jsonResponse(403, ['error' => 'Permissão insuficiente para esta operação administrativa.']);
    }
    return $user;
}

function formatUserRow(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'name' => (string) $row['name'],
        'role' => (string) $row['role'],
        'hierarchyLevel' => (int) $row['hierarchy_level'],
        'department' => (string) $row['department'],
        'email' => (string) $row['email'],
        'phone' => (string) ($row['phone'] ?? ''),
        'avatarUrl' => (string) ($row['avatar_url'] ?? ''),
        'bio' => (string) ($row['bio'] ?? ''),
        'linkedClientName' => $row['linked_client_name'] ?: null,
        'allowedModules' => json_decode((string) ($row['allowed_modules_json'] ?? '[]'), true) ?: [],
        'permissions' => json_decode((string) ($row['permissions_json'] ?? '{}'), true) ?: [],
        'active' => (bool) $row['active'],
    ];
}

// ----------------------------------------------------------------------------
// 3. Resolução da Rota (/api/...)
// ----------------------------------------------------------------------------
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$requestUriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/api/index.php')), '/');

if ($scriptDir !== '' && str_starts_with($requestUriPath, $scriptDir)) {
    $routePath = substr($requestUriPath, strlen($scriptDir));
} elseif (str_starts_with($requestUriPath, '/api')) {
    $routePath = substr($requestUriPath, 4);
} else {
    $routePath = $requestUriPath;
}

$routePath = '/' . trim($routePath, '/');
$segments = $routePath === '/' ? [] : explode('/', trim($routePath, '/'));
$resource = $segments[0] ?? '';
$subResource = $segments[1] ?? null;
$itemId = $segments[2] ?? ($subResource && !in_array($subResource, ['leads', 'contracts', 'tasks', 'login', 'me', 'logout', 'setup-admin'], true) ? $subResource : null);

// ----------------------------------------------------------------------------
// 4. Rotas Públicas de Diagnóstico & Config
// ----------------------------------------------------------------------------
if ($resource === 'health' && $method === 'GET') {
    jsonResponse(200, [
        'ok' => true,
        'service' => 'fortmidia-fortnews-php-mysql-api',
        'timestamp' => gmdate('c'),
    ]);
}

if ($resource === 'public-config' && $method === 'GET') {
    jsonResponse(200, [
        'mapsApiKey' => (string) ($config['google_maps_api_key'] ?? ''),
        'aiScannerReady' => !empty($config['gemini_api_key']),
    ]);
}

// ----------------------------------------------------------------------------
// 5. Autenticação (/api/auth/setup-admin, /login, /me, /logout)
// ----------------------------------------------------------------------------
if ($resource === 'auth') {
    $pdo = getPdo($config);

    // Bootstrap único do primeiro Super Admin (funciona apenas com a tabela users vazia)
    if ($subResource === 'setup-admin' && $method === 'POST') {
        $count = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
        if ($count > 0) {
            jsonResponse(409, ['error' => 'O Super Admin inicial já foi configurado.']);
        }
        $body = readJsonBody();
        $name = trim((string) ($body['name'] ?? 'Emerson Carneiro dos Santos'));
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $password = (string) ($body['password'] ?? '');

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
            jsonResponse(400, ['error' => 'Informe um e-mail válido e uma senha com pelo menos 8 caracteres.']);
        }

        $id = 'usr-01';
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare(
            'INSERT INTO users (id, name, role, hierarchy_level, department, email, phone, password_hash, active)
             VALUES (:id, :name, :role, 1, :department, :email, :phone, :password_hash, 1)'
        );
        $stmt->execute([
            ':id' => $id,
            ':name' => $name,
            ':role' => 'Super Admin / Diretoria',
            ':department' => 'Diretoria Executiva, Editor-Chefe & Super Admin',
            ':email' => $email,
            ':phone' => '(11) 95779-2424',
            ':password_hash' => $hash,
        ]);

        jsonResponse(201, ['ok' => true, 'message' => 'Super Admin criado com sucesso.']);
    }

    if ($subResource === 'login' && $method === 'POST') {
        $body = readJsonBody();
        $username = strtolower(trim((string) ($body['username'] ?? '')));
        $password = (string) ($body['password'] ?? '');

        if ($username === '' || $password === '') {
            jsonResponse(400, ['error' => 'Informe usuário e senha para continuar.']);
        }

        $stmt = $pdo->prepare(
            'SELECT * FROM users
              WHERE LOWER(email) = :exact
                 OR LOWER(SUBSTRING_INDEX(email, "@", 1)) = :prefix
                 OR LOWER(name) = :name_exact
              LIMIT 1'
        );
        $stmt->execute([
            ':exact' => $username,
            ':prefix' => $username,
            ':name_exact' => $username,
        ]);
        $row = $stmt->fetch();

        if (!$row || !password_verify($password, (string) $row['password_hash'])) {
            jsonResponse(401, ['error' => 'Usuário ou senha inválidos.']);
        }
        if (!(bool) $row['active']) {
            jsonResponse(403, ['error' => 'Este usuário encontra-se inativo.']);
        }

        $rawToken = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $rawToken);
        $ttlHours = max(1, (int) ($config['session_ttl_hours'] ?? 24));
        $expiresAt = gmdate('Y-m-d H:i:s', time() + ($ttlHours * 3600));

        $ins = $pdo->prepare(
            'INSERT INTO user_sessions (user_id, token_hash, ip_address, user_agent, expires_at)
             VALUES (:user_id, :token_hash, :ip, :ua, :expires_at)'
        );
        $ins->execute([
            ':user_id' => $row['id'],
            ':token_hash' => $tokenHash,
            ':ip' => substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64),
            ':ua' => substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255),
            ':expires_at' => $expiresAt,
        ]);

        jsonResponse(200, [
            'token' => $rawToken,
            'expiresAt' => $expiresAt,
            'user' => formatUserRow($row),
        ]);
    }

    if ($subResource === 'me' && $method === 'GET') {
        $user = requireAuth($pdo);
        jsonResponse(200, ['user' => $user]);
    }

    if ($subResource === 'logout' && $method === 'POST') {
        $token = extractBearerToken();
        if ($token !== null) {
            $stmt = $pdo->prepare('DELETE FROM user_sessions WHERE token_hash = :token_hash');
            $stmt->execute([':token_hash' => hash('sha256', $token)]);
        }
        jsonResponse(200, ['ok' => true]);
    }

    jsonResponse(404, ['error' => 'Endpoint de autenticação não encontrado.']);
}

// ----------------------------------------------------------------------------
// 6. Sincronização de Snapshot Completo (/api/state)
// ----------------------------------------------------------------------------
if ($resource === 'state') {
    $pdo = getPdo($config);
    $user = requireAuth($pdo);

    if ($method === 'GET') {
        $stmt = $pdo->prepare(
            'SELECT payload_json, updated_at FROM app_state_snapshots WHERE snapshot_key = :k LIMIT 1'
        );
        $stmt->execute([':k' => 'fortmidia_portal_state']);
        $row = $stmt->fetch();
        if (!$row) {
            jsonResponse(200, ['state' => null]);
        }
        jsonResponse(200, [
            'state' => json_decode((string) $row['payload_json'], true),
            'updatedAt' => $row['updated_at'],
        ]);
    }

    if ($method === 'PUT' || $method === 'POST') {
        $body = readJsonBody();
        if (!isset($body['state']) || !is_array($body['state'])) {
            jsonResponse(400, ['error' => 'Payload "state" inválido.']);
        }
        $encoded = json_encode($body['state'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $stmt = $pdo->prepare(
            'INSERT INTO app_state_snapshots (snapshot_key, payload_json, updated_by)
             VALUES (:k, :payload, :uid)
             ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json), updated_by = VALUES(updated_by)'
        );
        $stmt->execute([
            ':k' => 'fortmidia_portal_state',
            ':payload' => $encoded,
            ':uid' => $user['id'],
        ]);
        jsonResponse(200, ['ok' => true, 'updatedAt' => gmdate('c')]);
    }
}

// ----------------------------------------------------------------------------
// 7. Notícias & Pautas (/api/pautas)
// ----------------------------------------------------------------------------
if ($resource === 'pautas') {
    $pdo = getPdo($config);

    if ($method === 'GET') {
        $user = getAuthenticatedUser($pdo);
        if ($user !== null) {
            $rows = $pdo->query('SELECT * FROM news_pautas ORDER BY created_at DESC LIMIT 200')->fetchAll();
        } else {
            $stmt = $pdo->prepare(
                'SELECT * FROM news_pautas WHERE approval_status = :status ORDER BY created_at DESC LIMIT 100'
            );
            $stmt->execute([':status' => 'Publicada no Site']);
            $rows = $stmt->fetchAll();
        }
        jsonResponse(200, ['items' => $rows]);
    }

    requireAuth($pdo);

    if ($method === 'POST') {
        $b = readJsonBody();
        $id = trim((string) ($b['id'] ?? ('pau-' . time())));
        $stmt = $pdo->prepare(
            'INSERT INTO news_pautas
             (id, title, city, seal, format, reporter, deadline, status, approval_status, summary, body, image_url, media_type, video_url, source_protocol, ai_generated)
             VALUES
             (:id, :title, :city, :seal, :format, :reporter, :deadline, :status, :approval_status, :summary, :body, :image_url, :media_type, :video_url, :source_protocol, :ai_generated)'
        );
        $stmt->execute([
            ':id' => $id,
            ':title' => trim((string) ($b['title'] ?? 'Sem título')),
            ':city' => trim((string) ($b['city'] ?? 'Regional CIMBAJU')),
            ':seal' => trim((string) ($b['seal'] ?? 'Geral')),
            ':format' => trim((string) ($b['format'] ?? 'Portal 24/7')),
            ':reporter' => trim((string) ($b['reporter'] ?? 'Redação FortNews')),
            ':deadline' => (string) ($b['deadline'] ?? ''),
            ':status' => trim((string) ($b['status'] ?? 'Apuração de Rua')),
            ':approval_status' => trim((string) ($b['approvalStatus'] ?? 'Aguardando Redator-Chefe')),
            ':summary' => (string) ($b['summary'] ?? ''),
            ':body' => (string) ($b['body'] ?? ''),
            ':image_url' => (string) ($b['imageUrl'] ?? ''),
            ':media_type' => (string) ($b['mediaType'] ?? 'image'),
            ':video_url' => (string) ($b['videoUrl'] ?? ''),
            ':source_protocol' => $b['sourceProtocol'] ?? null,
            ':ai_generated' => !empty($b['aiGenerated']) ? 1 : 0,
        ]);
        jsonResponse(201, ['item' => array_merge($b, ['id' => $id])]);
    }

    if ($method === 'DELETE' && $itemId) {
        $stmt = $pdo->prepare('DELETE FROM news_pautas WHERE id = :id');
        $stmt->execute([':id' => $itemId]);
        jsonResponse(200, ['ok' => true]);
    }
}

// ----------------------------------------------------------------------------
// 8. Demandas Cidadãs — Canal Fala Cidadão (/api/demandas)
// ----------------------------------------------------------------------------
if ($resource === 'demandas') {
    $pdo = getPdo($config);

    // Envio público pelo formulário Fala Cidadão
    if ($method === 'POST') {
        $b = readJsonBody();
        $id = trim((string) ($b['id'] ?? ('rep-' . time())));
        $protocol = trim((string) ($b['protocol'] ?? ('FC-' . date('Y') . '-' . random_int(1000, 9999))));
        $stmt = $pdo->prepare(
            'INSERT INTO citizen_reports
             (id, protocol, citizen_name, contact, city, neighborhood, category, urgency, title, description, status, created_at_label)
             VALUES
             (:id, :protocol, :citizen_name, :contact, :city, :neighborhood, :category, :urgency, :title, :description, :status, :created_at_label)'
        );
        $stmt->execute([
            ':id' => $id,
            ':protocol' => $protocol,
            ':citizen_name' => trim((string) ($b['citizenName'] ?? 'Cidadão')),
            ':contact' => trim((string) ($b['contact'] ?? '')),
            ':city' => trim((string) ($b['city'] ?? 'Franco da Rocha')),
            ':neighborhood' => trim((string) ($b['neighborhood'] ?? '')),
            ':category' => trim((string) ($b['category'] ?? 'Zeladoria & Infraestrutura')),
            ':urgency' => trim((string) ($b['urgency'] ?? 'Normal')),
            ':title' => trim((string) ($b['title'] ?? '')),
            ':description' => trim((string) ($b['description'] ?? '')),
            ':status' => 'Aguardando Triagem',
            ':created_at_label' => (string) ($b['createdAt'] ?? date('d/m/Y · H:i')),
        ]);
        jsonResponse(201, ['item' => array_merge($b, ['id' => $id, 'protocol' => $protocol])]);
    }

    requireAuth($pdo);

    if ($method === 'GET') {
        $rows = $pdo->query('SELECT * FROM citizen_reports ORDER BY created_at DESC LIMIT 200')->fetchAll();
        jsonResponse(200, ['items' => $rows]);
    }

    if ($method === 'PUT' && $itemId) {
        $b = readJsonBody();
        $stmt = $pdo->prepare('UPDATE citizen_reports SET status = :status WHERE id = :id');
        $stmt->execute([
            ':status' => trim((string) ($b['status'] ?? 'Em Verificação')),
            ':id' => $itemId,
        ]);
        jsonResponse(200, ['ok' => true]);
    }

    if ($method === 'DELETE' && $itemId) {
        $stmt = $pdo->prepare('DELETE FROM citizen_reports WHERE id = :id');
        $stmt->execute([':id' => $itemId]);
        jsonResponse(200, ['ok' => true]);
    }
}

// ----------------------------------------------------------------------------
// 9. CRM — Leads & Contratos (/api/clientes/leads, /api/clientes/contracts)
// ----------------------------------------------------------------------------
if ($resource === 'clientes') {
    $pdo = getPdo($config);

    if ($subResource === 'leads') {
        if ($method === 'POST') {
            $b = readJsonBody();
            $id = trim((string) ($b['id'] ?? ('lead-' . time())));
            $stmt = $pdo->prepare(
                'INSERT INTO crm_leads (id, company_or_name, contact, city, quota_title, notes, status, created_at_label)
                 VALUES (:id, :company, :contact, :city, :quota, :notes, :status, :created_label)'
            );
            $stmt->execute([
                ':id' => $id,
                ':company' => trim((string) ($b['companyOrName'] ?? '')),
                ':contact' => trim((string) ($b['contact'] ?? '')),
                ':city' => trim((string) ($b['city'] ?? 'Franco da Rocha')),
                ':quota' => trim((string) ($b['quotaTitle'] ?? '')),
                ':notes' => (string) ($b['notes'] ?? ''),
                ':status' => 'Novo Lead',
                ':created_label' => (string) ($b['createdAt'] ?? date('d/m/Y · H:i')),
            ]);
            jsonResponse(201, ['item' => array_merge($b, ['id' => $id])]);
        }

        requireAuth($pdo);

        if ($method === 'GET') {
            $rows = $pdo->query('SELECT * FROM crm_leads ORDER BY created_at DESC LIMIT 200')->fetchAll();
            jsonResponse(200, ['items' => $rows]);
        }
    }

    if ($subResource === 'contracts') {
        requireAuth($pdo);
        if ($method === 'GET') {
            $rows = $pdo->query('SELECT * FROM crm_contracts ORDER BY created_at DESC LIMIT 200')->fetchAll();
            jsonResponse(200, ['items' => $rows]);
        }
    }
}

// ----------------------------------------------------------------------------
// 10. Usuários (/api/usuarios) — Protegido para Super Admin / Admin
// ----------------------------------------------------------------------------
if ($resource === 'usuarios') {
    $pdo = getPdo($config);
    requireAdmin($pdo);

    if ($method === 'GET') {
        $rows = $pdo->query(
            'SELECT id, name, role, hierarchy_level, department, email, phone, avatar_url, bio,
                    linked_client_name, allowed_modules_json, permissions_json, active
               FROM users ORDER BY hierarchy_level ASC, name ASC'
        )->fetchAll();
        jsonResponse(200, ['items' => array_map('formatUserRow', $rows)]);
    }

    if ($method === 'POST') {
        $b = readJsonBody();
        $email = strtolower(trim((string) ($b['email'] ?? '')));
        $password = (string) ($b['password'] ?? '');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 6) {
            jsonResponse(400, ['error' => 'E-mail inválido ou senha muito curta.']);
        }
        $id = trim((string) ($b['id'] ?? ('usr-' . time())));
        $stmt = $pdo->prepare(
            'INSERT INTO users
             (id, name, role, hierarchy_level, department, email, phone, password_hash, avatar_url, bio, linked_client_name, allowed_modules_json, permissions_json, active)
             VALUES
             (:id, :name, :role, :level, :dept, :email, :phone, :hash, :avatar, :bio, :client, :mods, :perms, :active)'
        );
        $stmt->execute([
            ':id' => $id,
            ':name' => trim((string) ($b['name'] ?? '')),
            ':role' => trim((string) ($b['role'] ?? 'Executivo Comercial')),
            ':level' => (int) ($b['hierarchyLevel'] ?? 4),
            ':dept' => trim((string) ($b['department'] ?? 'Operações FortMídia')),
            ':email' => $email,
            ':phone' => trim((string) ($b['phone'] ?? '')),
            ':hash' => password_hash($password, PASSWORD_BCRYPT),
            ':avatar' => (string) ($b['avatarUrl'] ?? ''),
            ':bio' => (string) ($b['bio'] ?? ''),
            ':client' => $b['linkedClientName'] ?? null,
            ':mods' => json_encode($b['allowedModules'] ?? []),
            ':perms' => json_encode($b['permissions'] ?? []),
            ':active' => !isset($b['active']) || $b['active'] ? 1 : 0,
        ]);
        jsonResponse(201, ['ok' => true, 'id' => $id]);
    }
}

// ----------------------------------------------------------------------------
// 11. Proxy Seguro de IA (/api/ai) — GEMINI_API_KEY lida APENAS no servidor
// ----------------------------------------------------------------------------
if ($resource === 'ai' && $method === 'POST') {
    $pdo = getPdo($config);
    requireAuth($pdo);

    $apiKey = trim((string) ($config['gemini_api_key'] ?? ''));
    if ($apiKey === '') {
        jsonResponse(503, [
            'error' => 'GEMINI_API_KEY não configurada no servidor PHP (config.php / variável de ambiente).',
        ]);
    }

    $body = readJsonBody();
    $action = strtolower(trim((string) ($body['action'] ?? '')));

    if (!in_array($action, ['scan-news', 'generate-ticker', 'generate-thumbnail'], true)) {
        jsonResponse(400, [
            'error' => 'Ação IA inválida. Utilize: scan-news, generate-ticker ou generate-thumbnail.',
        ]);
    }

    if ($action === 'generate-ticker') {
        $region = trim((string) ($body['region'] ?? $body['territory'] ?? 'Regional CIMBAJU, São Paulo e Brasil'));
        $prompt = "Você é editor de plantão do Portal Jornal FortNews. Gere 6 legendas curtas (máx 98 caracteres cada) com tag em maiúsculo (ex: CIMBAJU:, URGENTE:, ECONOMIA:) para a barra circulante sobre \"{$region}\". Retorne exclusivamente um JSON Array de strings.";
        $geminiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
        $payload = [
            'contents' => [['parts' => [['text' => $prompt]]]],
            'tools' => [['google_search' => new stdClass()]],
        ];
    } elseif ($action === 'scan-news') {
        $region = trim((string) ($body['territory'] ?? $body['region'] ?? 'Regional CIMBAJU'));
        $topics = trim((string) ($body['topics'] ?? $body['topic'] ?? 'infraestrutura, mobilidade, saúde, segurança, economia'));
        $count = max(1, min(4, (int) ($body['count'] ?? 2)));
        $prompt = "Você é editor-chefe do Jornal FortNews (CIMBAJU). Pesquise notícias atuais sobre \"{$region}\" e temas \"{$topics}\". Retorne exclusivamente um JSON Array com {$count} objetos contendo: title, summary, body, suggestedSeal, city e socialCreative (headlineOverlay, instagramCaption, storyCta, hashtags, visualDirection).";
        $geminiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
        $payload = [
            'contents' => [['parts' => [['text' => $prompt]]]],
            'tools' => [['google_search' => new stdClass()]],
        ];
    } else {
        $customPrompt = trim((string) ($body['prompt'] ?? 'Estúdio moderno de podcast jornalístico com iluminação laranja e dourada, sem textos'));
        $geminiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';
        $payload = [
            'contents' => [['parts' => [['text' => $customPrompt]]]],
        ];
    }

    $ch = curl_init($geminiEndpoint);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'x-goog-api-key: ' . $apiKey,
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
    ]);

    $rawResponse = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($rawResponse === false || $httpCode < 200 || $httpCode >= 300) {
        jsonResponse(502, ['error' => 'Falha ao consultar o provedor de IA no servidor.']);
    }

    $decoded = json_decode($rawResponse, true);
    $parts = $decoded['candidates'][0]['content']['parts'] ?? [];
    $textOut = '';
    $imageDataUrl = '';
    foreach ($parts as $part) {
        if (isset($part['text'])) {
            $textOut .= (string) $part['text'];
        }
        if (isset($part['inlineData']['data'])) {
            $mime = (string) ($part['inlineData']['mimeType'] ?? 'image/png');
            $imageDataUrl = 'data:' . $mime . ';base64,' . $part['inlineData']['data'];
        }
    }

    if ($action === 'generate-thumbnail') {
        if ($imageDataUrl === '') {
            jsonResponse(502, ['error' => 'A IA não retornou uma imagem válida.']);
        }
        jsonResponse(200, ['imageUrl' => $imageDataUrl, 'generatedAt' => date('d/m/Y H:i')]);
    }

    $cleaned = preg_replace('/^```(?:json)?\s*|\s*```$/i', '', trim($textOut)) ?: '[]';
    $parsedJson = json_decode($cleaned, true);

    if ($action === 'generate-ticker') {
        jsonResponse(200, [
            'items' => is_array($parsedJson) ? array_values($parsedJson) : [],
            'generatedAt' => date('d/m/Y H:i'),
        ]);
    }

    jsonResponse(200, [
        'articles' => is_array($parsedJson) ? array_values($parsedJson) : [],
        'scannedAt' => date('d/m/Y H:i'),
    ]);
}

jsonResponse(404, ['error' => 'Endpoint REST não encontrado.']);
