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
 * - CRUD completo no MySQL para contratos, leads, pipeline, matérias/pautas, financeiro,
 *   campanhas, outdoors, demandas cidadãs e usuários
 * - Rotina POST /api/sync/seed para popular dados iniciais com 1 clique
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
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept, X-Requested-With');
    header('Access-Control-Max-Age: 86400');
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ----------------------------------------------------------------------------
// 2. Utilitários de Resposta, Entrada, PDO & Introspecção Segura de Colunas
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

/**
 * Retorna os nomes de colunas disponíveis na tabela (whitelist contra SQL injection
 * e compatibilidade retroativa com bancos que ainda não rodaram os ALTER TABLE opcionais).
 */
function getTableColumns(PDO $pdo, string $table, bool $forceRefresh = false): array
{
    static $cache = [];
    if (!$forceRefresh && isset($cache[$table])) {
        return $cache[$table];
    }

    $allowedTables = [
        'users',
        'user_sessions',
        'news_pautas',
        'crm_leads',
        'crm_contracts',
        'crm_client_tasks',
        'financial_entries',
        'campaigns',
        'outdoor_points',
        'citizen_reports',
        'app_state_snapshots',
    ];
    if (!in_array($table, $allowedTables, true)) {
        return [];
    }

    try {
        $rows = $pdo->query('SHOW COLUMNS FROM `' . $table . '`')->fetchAll();
        $cols = [];
        foreach ($rows as $row) {
            if (isset($row['Field'])) {
                $cols[(string) $row['Field']] = true;
            }
        }
        $cache[$table] = $cols;
        return $cols;
    } catch (Throwable) {
        $cache[$table] = [];
        return [];
    }
}

function ensureUsersLoginNameColumn(PDO $pdo): array
{
    $cols = getTableColumns($pdo, 'users');
    if (isset($cols['login_name'])) {
        return $cols;
    }
    try {
        $pdo->exec('ALTER TABLE `users` ADD COLUMN `login_name` VARCHAR(80) DEFAULT NULL AFTER `name`');
        try {
            $pdo->exec('CREATE UNIQUE INDEX `idx_users_login_name` ON `users` (`login_name`)');
        } catch (Throwable) {
            // Índice já existente ou sem permissão de índice
        }
        return getTableColumns($pdo, 'users', true);
    } catch (Throwable) {
        return $cols;
    }
}

function ensureUserSessionsTable(PDO $pdo): void
{
    if (getTableColumns($pdo, 'user_sessions') !== []) {
        return;
    }
    try {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS `user_sessions` (
                `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                `user_id` VARCHAR(64) NOT NULL,
                `token_hash` CHAR(64) NOT NULL UNIQUE,
                `ip_address` VARCHAR(64) DEFAULT NULL,
                `user_agent` VARCHAR(255) DEFAULT NULL,
                `expires_at` DATETIME NOT NULL,
                `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX `idx_sessions_user` (`user_id`),
                INDEX `idx_sessions_expires` (`expires_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
        getTableColumns($pdo, 'user_sessions', true);
    } catch (Throwable) {
        // Ignora caso o usuário do banco não possua privilégio CREATE TABLE
    }
}

function insertFilteredRow(PDO $pdo, string $table, array $data, bool $ignore = false): int
{
    $columns = getTableColumns($pdo, $table);
    if ($columns === []) {
        throw new RuntimeException("Tabela {$table} indisponível no banco MySQL.");
    }

    $fields = [];
    $placeholders = [];
    $params = [];

    foreach ($data as $col => $value) {
        if (!isset($columns[$col])) {
            continue;
        }
        $fields[] = '`' . $col . '`';
        $param = ':p_' . $col;
        $placeholders[] = $param;
        $params[$param] = $value;
    }

    if ($fields === []) {
        return 0;
    }

    $keyword = $ignore ? 'INSERT IGNORE INTO' : 'INSERT INTO';
    $sql = sprintf(
        '%s `%s` (%s) VALUES (%s)',
        $keyword,
        $table,
        implode(', ', $fields),
        implode(', ', $placeholders)
    );
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->rowCount();
}

function updateFilteredRow(PDO $pdo, string $table, string $id, array $data): int
{
    $columns = getTableColumns($pdo, $table);
    if ($columns === []) {
        throw new RuntimeException("Tabela {$table} indisponível no banco MySQL.");
    }

    $sets = [];
    $params = [':where_id' => $id];

    foreach ($data as $col => $value) {
        if ($col === 'id' || !isset($columns[$col])) {
            continue;
        }
        $param = ':u_' . $col;
        $sets[] = '`' . $col . '` = ' . $param;
        $params[$param] = $value;
    }

    if ($sets === []) {
        return 0;
    }

    $sql = sprintf('UPDATE `%s` SET %s WHERE `id` = :where_id', $table, implode(', ', $sets));
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->rowCount();
}

function isHttpsRequest(): bool
{
    if (!empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off') {
        return true;
    }
    if (strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https') {
        return true;
    }
    if (strtolower((string) ($_SERVER['REQUEST_SCHEME'] ?? '')) === 'https') {
        return true;
    }
    if (str_contains(strtolower((string) ($_SERVER['HTTP_CF_VISITOR'] ?? '')), '"https"')) {
        return true;
    }
    return ((int) ($_SERVER['SERVER_PORT'] ?? 80)) === 443;
}

function setSessionCookie(string $rawToken, int $ttlSeconds): void
{
    $cookie = 'fortmidia_session=' . rawurlencode($rawToken)
        . '; Path=/; Max-Age=' . max(60, $ttlSeconds)
        . '; HttpOnly';
    if (isHttpsRequest()) {
        $cookie .= '; Secure; SameSite=None; Partitioned';
    } else {
        $cookie .= '; SameSite=Lax';
    }
    header('Set-Cookie: ' . $cookie, false);
}

function clearSessionCookie(): void
{
    $cookie = 'fortmidia_session=; Path=/; Max-Age=0; HttpOnly';
    if (isHttpsRequest()) {
        $cookie .= '; Secure; SameSite=None; Partitioned';
    } else {
        $cookie .= '; SameSite=Lax';
    }
    header('Set-Cookie: ' . $cookie, false);
}

function normalizeSimpleLogin(string $raw): string
{
    $s = trim($raw);
    if ($s === '') {
        return '';
    }
    $s = mb_strtolower($s, 'UTF-8');
    $map = [
        'á' => 'a', 'à' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a',
        'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
        'í' => 'i', 'ì' => 'i', 'î' => 'i', 'ï' => 'i',
        'ó' => 'o', 'ò' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o',
        'ú' => 'u', 'ù' => 'u', 'û' => 'u', 'ü' => 'u',
        'ç' => 'c', 'ñ' => 'n',
    ];
    return strtr($s, $map);
}

function slugifyLoginName(string $raw): string
{
    $norm = normalizeSimpleLogin($raw);
    $slug = preg_replace('/[^a-z0-9._-]+/', '', $norm) ?? '';
    return trim($slug, '._-');
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

function extractSessionToken(?bool &$fromCookie = null): ?string
{
    $bearer = extractBearerToken();
    if ($bearer !== null) {
        $fromCookie = false;
        return $bearer;
    }

    $cookieToken = trim((string) ($_COOKIE['fortmidia_session'] ?? ''));
    if ($cookieToken !== '' && preg_match('/^[A-Za-z0-9._\-]{20,256}$/', $cookieToken)) {
        $fromCookie = true;
        return $cookieToken;
    }

    $fromCookie = false;
    return null;
}

function verifyCookieCsrf(array $allowedOrigins): void
{
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if (in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) {
        return;
    }

    $requestedWith = strtolower(trim((string) ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '')));
    if ($requestedWith === 'xmlhttprequest') {
        return;
    }

    $origin = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
    $host = strtolower(trim((string) ($_SERVER['HTTP_X_FORWARDED_HOST'] ?? $_SERVER['HTTP_HOST'] ?? '')));
    if ($origin !== '') {
        $originHost = strtolower((string) parse_url($origin, PHP_URL_HOST));
        if (in_array($origin, $allowedOrigins, true) || ($host !== '' && $originHost === explode(':', $host)[0])) {
            return;
        }
    }

    jsonResponse(403, ['error' => 'Origem não autorizada para esta operação autenticada.']);
}

function getAuthenticatedUser(PDO $pdo, array $allowedOrigins = []): ?array
{
    $fromCookie = false;
    $token = extractSessionToken($fromCookie);
    if ($token === null) {
        return null;
    }

    if ($fromCookie) {
        verifyCookieCsrf($allowedOrigins);
    }

    $tokenHash = hash('sha256', $token);
    $cols = getTableColumns($pdo, 'users');
    $loginCol = isset($cols['login_name']) ? 'u.login_name,' : '';
    $stmt = $pdo->prepare(
        "SELECT u.id, u.name, {$loginCol} u.role, u.hierarchy_level, u.department, u.email, u.phone,
                u.avatar_url, u.bio, u.linked_client_name, u.allowed_modules_json,
                u.permissions_json, u.active
           FROM user_sessions s
           INNER JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = :token_hash
            AND s.expires_at > UTC_TIMESTAMP()
            AND u.active = 1
          LIMIT 1"
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
    global $allowedOrigins;
    $user = getAuthenticatedUser($pdo, $allowedOrigins);
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

function requireSuperAdmin(PDO $pdo): array
{
    $user = requireAuth($pdo);
    if ((int) ($user['hierarchyLevel'] ?? 99) !== 1) {
        jsonResponse(403, ['error' => 'Apenas o Super Admin pode criar usuários ou definir/alterar senhas de acesso.']);
    }
    return $user;
}

// ----------------------------------------------------------------------------
// 3. Formatadores Canônicos (MySQL snake_case -> Frontend camelCase)
// ----------------------------------------------------------------------------
function decodeJsonField(mixed $raw, mixed $fallback): mixed
{
    if (is_array($raw)) {
        return $raw;
    }
    if (!is_string($raw) || trim($raw) === '') {
        return $fallback;
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : $fallback;
}

function formatUserRow(array $row): array
{
    $email = (string) ($row['email'] ?? '');
    $derivedLogin = !empty($row['login_name'])
        ? (string) $row['login_name']
        : (str_contains($email, '@') ? explode('@', $email)[0] : slugifyLoginName((string) ($row['name'] ?? '')));

    return [
        'id' => (string) $row['id'],
        'name' => (string) $row['name'],
        'loginName' => $derivedLogin,
        'role' => (string) $row['role'],
        'hierarchyLevel' => (int) $row['hierarchy_level'],
        'department' => (string) $row['department'],
        'email' => $email,
        'phone' => (string) ($row['phone'] ?? ''),
        'avatarUrl' => (string) ($row['avatar_url'] ?? ''),
        'bio' => (string) ($row['bio'] ?? ''),
        'linkedClientName' => !empty($row['linked_client_name']) ? (string) $row['linked_client_name'] : null,
        'allowedModules' => decodeJsonField($row['allowed_modules_json'] ?? null, []),
        'permissions' => decodeJsonField($row['permissions_json'] ?? null, []),
        'active' => (bool) $row['active'],
    ];
}

function formatPautaRow(array $row): array
{
    $item = [
        'id' => (string) $row['id'],
        'title' => (string) ($row['title'] ?? ''),
        'city' => (string) ($row['city'] ?? 'Regional CIMBAJU'),
        'seal' => (string) ($row['seal'] ?? 'Geral'),
        'format' => (string) ($row['format'] ?? 'Portal 24/7'),
        'reporter' => (string) ($row['reporter'] ?? 'Redação FortNews'),
        'deadline' => (string) ($row['deadline'] ?? ''),
        'status' => (string) ($row['status'] ?? 'Apuração de Rua'),
        'approvalStatus' => (string) ($row['approval_status'] ?? 'Aguardando Redator-Chefe'),
        'summary' => (string) ($row['summary'] ?? ''),
        'body' => (string) ($row['body'] ?? ''),
        'imageUrl' => (string) ($row['image_url'] ?? ''),
        'mediaType' => (string) ($row['media_type'] ?? 'image'),
        'videoUrl' => !empty($row['video_url']) ? (string) $row['video_url'] : null,
        'sourceProtocol' => !empty($row['source_protocol']) ? (string) $row['source_protocol'] : null,
        'approvedBy' => !empty($row['approved_by']) ? (string) $row['approved_by'] : null,
        'publishedAt' => !empty($row['published_at']) ? (string) $row['published_at'] : null,
        'aiGenerated' => !empty($row['ai_generated']),
        'sourceUrls' => decodeJsonField($row['source_urls_json'] ?? null, []),
        'socialCreative' => decodeJsonField($row['social_creative_json'] ?? null, null),
    ];
    if (isset($row['internal_code']) && $row['internal_code'] !== null && $row['internal_code'] !== '') {
        $item['internalCode'] = (string) $row['internal_code'];
    }
    if (!empty($row['assigned_reporter_id'])) {
        $item['assignedReporterId'] = (string) $row['assigned_reporter_id'];
    }
    return $item;
}

function formatLeadRow(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'companyOrName' => (string) ($row['company_or_name'] ?? ''),
        'contact' => (string) ($row['contact'] ?? ''),
        'city' => (string) ($row['city'] ?? 'Franco da Rocha'),
        'quotaTitle' => (string) ($row['quota_title'] ?? ''),
        'notes' => (string) ($row['notes'] ?? ''),
        'status' => (string) ($row['status'] ?? 'Novo Lead'),
        'createdAt' => (string) ($row['created_at_label'] ?? $row['created_at'] ?? ''),
    ];
}

function formatContractRow(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'clientName' => (string) ($row['client'] ?? ''),
        'segment' => (string) ($row['segment'] ?? 'Comércio Local'),
        'pillar' => (string) ($row['pillar'] ?? 'Combo 360°'),
        'city' => (string) ($row['city'] ?? 'Franco da Rocha'),
        'planName' => (string) ($row['product'] ?? ''),
        'monthlyValue' => (float) ($row['monthly_value'] ?? 0),
        'origin' => (string) ($row['origin'] ?? 'Captação da Casa (100%)'),
        'oohPoint' => !empty($row['ooh_point']) ? (string) $row['ooh_point'] : null,
        'status' => (string) ($row['status'] ?? 'Ativo'),
        'startDate' => (string) ($row['start_date'] ?? ''),
        'endDate' => (string) ($row['end_date'] ?? ''),
        'impressionsEstimate' => (string) ($row['impressions_estimate'] ?? ''),
    ];
}

function formatTaskRow(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'accessCode' => (string) ($row['access_code'] ?? ''),
        'clientName' => (string) ($row['client_name'] ?? ''),
        'title' => (string) ($row['campaign_title'] ?? ''),
        'serviceType' => (string) ($row['service_type'] ?? 'Combo 360°'),
        'city' => (string) ($row['city'] ?? 'Franco da Rocha'),
        'stage' => (string) ($row['stage'] ?? 'Briefing & Material'),
        'priority' => (string) ($row['priority'] ?? 'Normal'),
        'dueDate' => (string) ($row['due_date'] ?? ''),
        'assigneeName' => (string) ($row['assignee'] ?? ''),
        'assigneeAvatar' => (string) ($row['assignee_avatar'] ?? ''),
        'description' => (string) ($row['client_notes'] ?? ''),
        'clientFeedback' => !empty($row['client_feedback']) ? (string) $row['client_feedback'] : null,
        'outdoorCode' => !empty($row['outdoor_code']) ? (string) $row['outdoor_code'] : null,
        'checklist' => decodeJsonField($row['checklist_json'] ?? null, []),
        'updatedAt' => (string) ($row['updated_at_label'] ?? $row['updated_at'] ?? ''),
    ];
}

function formatFinancialRow(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'type' => (string) ($row['type'] ?? 'Receita'),
        'description' => (string) ($row['description'] ?? ''),
        'counterpartyName' => (string) ($row['counterparty_name'] ?? $row['client_or_vendor'] ?? ''),
        'counterpartyRole' => (string) ($row['counterparty_role'] ?? 'Anunciante / Cliente'),
        'costCenter' => (string) ($row['cost_center'] ?? $row['category'] ?? 'Operações FortMídia'),
        'dueDate' => (string) ($row['due_date'] ?? ''),
        'amount' => (float) ($row['amount'] ?? 0),
        'status' => (string) ($row['status'] ?? 'Pendente'),
        'paymentMethod' => (string) ($row['payment_method'] ?? 'PIX'),
        'invoiceRef' => !empty($row['invoice_ref'] ?? $row['reference_code'] ?? null)
            ? (string) ($row['invoice_ref'] ?? $row['reference_code'])
            : null,
    ];
}

function formatCampaignRow(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'advertiser' => (string) ($row['advertiser'] ?? ''),
        'title' => (string) ($row['title'] ?? ''),
        'adType' => (string) ($row['ad_type'] ?? 'Patrocínio'),
        'city' => (string) ($row['city'] ?? 'Franco da Rocha'),
        'placementSpec' => (string) ($row['placement_spec'] ?? ''),
        'startDate' => (string) ($row['start_date'] ?? ''),
        'endDate' => (string) ($row['end_date'] ?? ''),
        'value' => (float) ($row['contract_value'] ?? 0),
        'status' => (string) ($row['status'] ?? 'Programada'),
        'artworkStatus' => (string) ($row['artwork_status'] ?? 'Aguardando Material'),
        'accountManager' => (string) ($row['account_manager'] ?? 'Comercial FortMídia'),
    ];
}

function formatOutdoorRow(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'code' => (string) ($row['code'] ?? ''),
        'title' => (string) ($row['location_name'] ?? ''),
        'address' => (string) ($row['address_reference'] ?? ''),
        'city' => (string) ($row['city'] ?? 'Franco da Rocha'),
        'lat' => (float) ($row['lat'] ?? -23.3219),
        'lng' => (float) ($row['lng'] ?? -46.7272),
        'dimensions' => (string) ($row['dimensions'] ?? '9,00m x 3,00m'),
        'lighting' => (string) ($row['lighting'] ?? 'Iluminado (Frontlight)'),
        'bimonthlyPrice' => (float) ($row['biweekly_rate'] ?? $row['monthly_rate'] ?? 1350),
        'availability' => (string) ($row['availability'] ?? 'Disponível'),
        'currentAdvertiser' => !empty($row['current_advertiser']) ? (string) $row['current_advertiser'] : null,
        'availableFrom' => !empty($row['occupied_until']) ? (string) $row['occupied_until'] : null,
        'notes' => !empty($row['notes']) ? (string) $row['notes'] : null,
    ];
}

function formatCitizenReportRow(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'protocol' => (string) ($row['protocol'] ?? ''),
        'citizenName' => (string) ($row['citizen_name'] ?? ''),
        'contact' => (string) ($row['contact'] ?? ''),
        'city' => (string) ($row['city'] ?? 'Franco da Rocha'),
        'neighborhood' => (string) ($row['neighborhood'] ?? ''),
        'category' => (string) ($row['category'] ?? 'Zeladoria & Infraestrutura'),
        'urgency' => (string) ($row['urgency'] ?? 'Normal'),
        'title' => (string) ($row['title'] ?? ''),
        'description' => (string) ($row['description'] ?? ''),
        'status' => (string) ($row['status'] ?? 'Aguardando Triagem'),
        'triageScore' => isset($row['triage_score']) && $row['triage_score'] !== null ? (int) $row['triage_score'] : null,
        'assignedEditor' => !empty($row['assigned_editor']) ? (string) $row['assigned_editor'] : null,
        'officialResponseNote' => !empty($row['official_response_note']) ? (string) $row['official_response_note'] : null,
        'responseAuthor' => !empty($row['response_author']) ? (string) $row['response_author'] : null,
        'responseSentAt' => !empty($row['response_sent_at']) ? (string) $row['response_sent_at'] : null,
        'forwardedAt' => !empty($row['forwarded_at']) ? (string) $row['forwarded_at'] : null,
        'forwardedTo' => !empty($row['forwarded_to']) ? (string) $row['forwarded_to'] : null,
        'createdAt' => (string) ($row['created_at_label'] ?? $row['created_at'] ?? ''),
    ];
}

// ----------------------------------------------------------------------------
// 4. Mapeadores de Payload (Frontend -> Colunas MySQL)
// ----------------------------------------------------------------------------
function buildContractDbRow(array $b, bool $isCreate = false): array
{
    $data = [];
    if ($isCreate) {
        $data['id'] = trim((string) ($b['id'] ?? ('ctr-' . time())));
        $data['client'] = trim((string) ($b['clientName'] ?? $b['client'] ?? ''));
        $data['segment'] = trim((string) ($b['segment'] ?? 'Comércio Local'));
        $data['pillar'] = trim((string) ($b['pillar'] ?? 'Combo 360°'));
        $data['city'] = trim((string) ($b['city'] ?? 'Franco da Rocha'));
        $data['product'] = trim((string) ($b['planName'] ?? $b['product'] ?? ''));
        $data['origin'] = trim((string) ($b['origin'] ?? 'Captação da Casa'));
        $data['owner_name'] = trim((string) ($b['ownerName'] ?? 'Comercial FortMídia'));
        $data['ooh_point'] = isset($b['oohPoint']) && $b['oohPoint'] !== '' ? (string) $b['oohPoint'] : null;
        $data['monthly_value'] = (float) ($b['monthlyValue'] ?? 0);
        $data['start_date'] = (string) ($b['startDate'] ?? '');
        $data['end_date'] = (string) ($b['endDate'] ?? '');
        $data['impressions_estimate'] = (string) ($b['impressionsEstimate'] ?? '');
        $data['status'] = trim((string) ($b['status'] ?? 'Ativo'));
        return $data;
    }

    if (array_key_exists('clientName', $b) || array_key_exists('client', $b)) {
        $data['client'] = trim((string) ($b['clientName'] ?? $b['client'] ?? ''));
    }
    if (array_key_exists('segment', $b)) {
        $data['segment'] = trim((string) $b['segment']);
    }
    if (array_key_exists('pillar', $b)) {
        $data['pillar'] = trim((string) $b['pillar']);
    }
    if (array_key_exists('city', $b)) {
        $data['city'] = trim((string) $b['city']);
    }
    if (array_key_exists('planName', $b) || array_key_exists('product', $b)) {
        $data['product'] = trim((string) ($b['planName'] ?? $b['product'] ?? ''));
    }
    if (array_key_exists('origin', $b)) {
        $data['origin'] = trim((string) $b['origin']);
    }
    if (array_key_exists('ownerName', $b)) {
        $data['owner_name'] = trim((string) $b['ownerName']);
    }
    if (array_key_exists('oohPoint', $b)) {
        $data['ooh_point'] = $b['oohPoint'] !== null && $b['oohPoint'] !== '' ? (string) $b['oohPoint'] : null;
    }
    if (array_key_exists('monthlyValue', $b)) {
        $data['monthly_value'] = (float) $b['monthlyValue'];
    }
    if (array_key_exists('startDate', $b)) {
        $data['start_date'] = (string) $b['startDate'];
    }
    if (array_key_exists('endDate', $b)) {
        $data['end_date'] = (string) $b['endDate'];
    }
    if (array_key_exists('impressionsEstimate', $b)) {
        $data['impressions_estimate'] = (string) $b['impressionsEstimate'];
    }
    if (array_key_exists('status', $b)) {
        $data['status'] = trim((string) $b['status']);
    }
    return $data;
}

function buildLeadDbRow(array $b, bool $isCreate = false): array
{
    if ($isCreate) {
        return [
            'id' => trim((string) ($b['id'] ?? ('lead-' . time()))),
            'company_or_name' => trim((string) ($b['companyOrName'] ?? '')),
            'contact' => trim((string) ($b['contact'] ?? '')),
            'city' => trim((string) ($b['city'] ?? 'Franco da Rocha')),
            'quota_title' => trim((string) ($b['quotaTitle'] ?? '')),
            'notes' => (string) ($b['notes'] ?? ''),
            'status' => trim((string) ($b['status'] ?? 'Novo Lead')),
            'created_at_label' => (string) ($b['createdAt'] ?? date('d/m/Y · H:i')),
        ];
    }

    $data = [];
    if (array_key_exists('companyOrName', $b)) $data['company_or_name'] = trim((string) $b['companyOrName']);
    if (array_key_exists('contact', $b)) $data['contact'] = trim((string) $b['contact']);
    if (array_key_exists('city', $b)) $data['city'] = trim((string) $b['city']);
    if (array_key_exists('quotaTitle', $b)) $data['quota_title'] = trim((string) $b['quotaTitle']);
    if (array_key_exists('notes', $b)) $data['notes'] = (string) $b['notes'];
    if (array_key_exists('status', $b)) $data['status'] = trim((string) $b['status']);
    if (array_key_exists('createdAt', $b)) $data['created_at_label'] = (string) $b['createdAt'];
    return $data;
}

function buildPautaDbRow(array $b, bool $isCreate = false): array
{
    if ($isCreate) {
        return [
            'id' => trim((string) ($b['id'] ?? ('pau-' . time()))),
            'internal_code' => !empty($b['internalCode']) ? (string) $b['internalCode'] : null,
            'title' => trim((string) ($b['title'] ?? 'Sem título')),
            'city' => trim((string) ($b['city'] ?? 'Regional CIMBAJU')),
            'seal' => trim((string) ($b['seal'] ?? 'Geral')),
            'format' => trim((string) ($b['format'] ?? 'Portal 24/7')),
            'reporter' => trim((string) ($b['reporter'] ?? 'Redação FortNews')),
            'assigned_reporter_id' => !empty($b['assignedReporterId']) ? (string) $b['assignedReporterId'] : null,
            'deadline' => (string) ($b['deadline'] ?? ''),
            'status' => trim((string) ($b['status'] ?? 'Apuração de Rua')),
            'approval_status' => trim((string) ($b['approvalStatus'] ?? 'Aguardando Redator-Chefe')),
            'summary' => (string) ($b['summary'] ?? ''),
            'body' => (string) ($b['body'] ?? ''),
            'image_url' => (string) ($b['imageUrl'] ?? ''),
            'media_type' => (string) ($b['mediaType'] ?? 'image'),
            'video_url' => !empty($b['videoUrl']) ? (string) $b['videoUrl'] : null,
            'source_protocol' => !empty($b['sourceProtocol']) ? (string) $b['sourceProtocol'] : null,
            'approved_by' => !empty($b['approvedBy']) ? (string) $b['approvedBy'] : null,
            'published_at' => !empty($b['publishedAt']) ? (string) $b['publishedAt'] : null,
            'ai_generated' => !empty($b['aiGenerated']) ? 1 : 0,
            'source_urls_json' => isset($b['sourceUrls']) ? json_encode($b['sourceUrls'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null,
            'social_creative_json' => isset($b['socialCreative']) ? json_encode($b['socialCreative'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null,
        ];
    }

    $data = [];
    if (array_key_exists('internalCode', $b)) $data['internal_code'] = !empty($b['internalCode']) ? (string) $b['internalCode'] : null;
    if (array_key_exists('title', $b)) $data['title'] = trim((string) $b['title']);
    if (array_key_exists('city', $b)) $data['city'] = trim((string) $b['city']);
    if (array_key_exists('seal', $b)) $data['seal'] = trim((string) $b['seal']);
    if (array_key_exists('format', $b)) $data['format'] = trim((string) $b['format']);
    if (array_key_exists('reporter', $b)) $data['reporter'] = trim((string) $b['reporter']);
    if (array_key_exists('assignedReporterId', $b)) $data['assigned_reporter_id'] = !empty($b['assignedReporterId']) ? (string) $b['assignedReporterId'] : null;
    if (array_key_exists('deadline', $b)) $data['deadline'] = (string) $b['deadline'];
    if (array_key_exists('status', $b)) $data['status'] = trim((string) $b['status']);
    if (array_key_exists('approvalStatus', $b)) $data['approval_status'] = trim((string) $b['approvalStatus']);
    if (array_key_exists('summary', $b)) $data['summary'] = (string) $b['summary'];
    if (array_key_exists('body', $b)) $data['body'] = (string) $b['body'];
    if (array_key_exists('imageUrl', $b)) $data['image_url'] = (string) $b['imageUrl'];
    if (array_key_exists('mediaType', $b)) $data['media_type'] = (string) $b['mediaType'];
    if (array_key_exists('videoUrl', $b)) $data['video_url'] = !empty($b['videoUrl']) ? (string) $b['videoUrl'] : null;
    if (array_key_exists('sourceProtocol', $b)) $data['source_protocol'] = !empty($b['sourceProtocol']) ? (string) $b['sourceProtocol'] : null;
    if (array_key_exists('approvedBy', $b)) $data['approved_by'] = !empty($b['approvedBy']) ? (string) $b['approvedBy'] : null;
    if (array_key_exists('publishedAt', $b)) $data['published_at'] = !empty($b['publishedAt']) ? (string) $b['publishedAt'] : null;
    if (array_key_exists('aiGenerated', $b)) $data['ai_generated'] = !empty($b['aiGenerated']) ? 1 : 0;
    if (array_key_exists('sourceUrls', $b)) $data['source_urls_json'] = json_encode($b['sourceUrls'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (array_key_exists('socialCreative', $b)) $data['social_creative_json'] = $b['socialCreative'] !== null ? json_encode($b['socialCreative'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null;
    return $data;
}

function buildTaskDbRow(array $b, bool $isCreate = false): array
{
    if ($isCreate) {
        return [
            'id' => trim((string) ($b['id'] ?? ('tsk-' . time()))),
            'access_code' => (string) ($b['accessCode'] ?? ''),
            'client_name' => trim((string) ($b['clientName'] ?? '')),
            'campaign_title' => trim((string) ($b['title'] ?? $b['campaignTitle'] ?? '')),
            'service_type' => trim((string) ($b['serviceType'] ?? 'Combo 360°')),
            'city' => trim((string) ($b['city'] ?? 'Franco da Rocha')),
            'stage' => trim((string) ($b['stage'] ?? 'Briefing & Material')),
            'priority' => trim((string) ($b['priority'] ?? 'Normal')),
            'due_date' => (string) ($b['dueDate'] ?? ''),
            'assignee' => (string) ($b['assigneeName'] ?? $b['assignee'] ?? ''),
            'assignee_avatar' => (string) ($b['assigneeAvatar'] ?? ''),
            'deliverable_url' => !empty($b['deliverableUrl']) ? (string) $b['deliverableUrl'] : null,
            'client_notes' => (string) ($b['description'] ?? $b['clientNotes'] ?? ''),
            'client_feedback' => !empty($b['clientFeedback']) ? (string) $b['clientFeedback'] : null,
            'outdoor_code' => !empty($b['outdoorCode']) ? (string) $b['outdoorCode'] : null,
            'checklist_json' => json_encode($b['checklist'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'updated_at_label' => (string) ($b['updatedAt'] ?? date('d/m/Y · H:i')),
        ];
    }

    $data = [];
    if (array_key_exists('accessCode', $b)) $data['access_code'] = (string) $b['accessCode'];
    if (array_key_exists('clientName', $b)) $data['client_name'] = trim((string) $b['clientName']);
    if (array_key_exists('title', $b) || array_key_exists('campaignTitle', $b)) {
        $data['campaign_title'] = trim((string) ($b['title'] ?? $b['campaignTitle'] ?? ''));
    }
    if (array_key_exists('serviceType', $b)) $data['service_type'] = trim((string) $b['serviceType']);
    if (array_key_exists('city', $b)) $data['city'] = trim((string) $b['city']);
    if (array_key_exists('stage', $b)) $data['stage'] = trim((string) $b['stage']);
    if (array_key_exists('priority', $b)) $data['priority'] = trim((string) $b['priority']);
    if (array_key_exists('dueDate', $b)) $data['due_date'] = (string) $b['dueDate'];
    if (array_key_exists('assigneeName', $b) || array_key_exists('assignee', $b)) {
        $data['assignee'] = (string) ($b['assigneeName'] ?? $b['assignee'] ?? '');
    }
    if (array_key_exists('assigneeAvatar', $b)) $data['assignee_avatar'] = (string) $b['assigneeAvatar'];
    if (array_key_exists('deliverableUrl', $b)) $data['deliverable_url'] = !empty($b['deliverableUrl']) ? (string) $b['deliverableUrl'] : null;
    if (array_key_exists('description', $b) || array_key_exists('clientNotes', $b)) {
        $data['client_notes'] = (string) ($b['description'] ?? $b['clientNotes'] ?? '');
    }
    if (array_key_exists('clientFeedback', $b)) $data['client_feedback'] = !empty($b['clientFeedback']) ? (string) $b['clientFeedback'] : null;
    if (array_key_exists('outdoorCode', $b)) $data['outdoor_code'] = !empty($b['outdoorCode']) ? (string) $b['outdoorCode'] : null;
    if (array_key_exists('checklist', $b)) $data['checklist_json'] = json_encode($b['checklist'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (array_key_exists('updatedAt', $b)) $data['updated_at_label'] = (string) $b['updatedAt'];
    return $data;
}

function buildFinancialDbRow(array $b, bool $isCreate = false): array
{
    if ($isCreate) {
        return [
            'id' => trim((string) ($b['id'] ?? ('fin-' . time()))),
            'type' => trim((string) ($b['type'] ?? 'Receita')),
            'description' => trim((string) ($b['description'] ?? '')),
            'counterparty_name' => trim((string) ($b['counterpartyName'] ?? $b['clientOrVendor'] ?? '')),
            'counterparty_role' => trim((string) ($b['counterpartyRole'] ?? 'Anunciante / Cliente')),
            'cost_center' => trim((string) ($b['costCenter'] ?? $b['category'] ?? 'Operações FortMídia')),
            'due_date' => (string) ($b['dueDate'] ?? ''),
            'amount' => (float) ($b['amount'] ?? 0),
            'status' => trim((string) ($b['status'] ?? 'Pendente')),
            'payment_method' => trim((string) ($b['paymentMethod'] ?? 'PIX')),
            'invoice_ref' => !empty($b['invoiceRef'] ?? $b['referenceCode'] ?? null)
                ? (string) ($b['invoiceRef'] ?? $b['referenceCode'])
                : null,
        ];
    }

    $data = [];
    if (array_key_exists('type', $b)) $data['type'] = trim((string) $b['type']);
    if (array_key_exists('description', $b)) $data['description'] = trim((string) $b['description']);
    if (array_key_exists('counterpartyName', $b) || array_key_exists('clientOrVendor', $b)) {
        $data['counterparty_name'] = trim((string) ($b['counterpartyName'] ?? $b['clientOrVendor'] ?? ''));
    }
    if (array_key_exists('counterpartyRole', $b)) $data['counterparty_role'] = trim((string) $b['counterpartyRole']);
    if (array_key_exists('costCenter', $b) || array_key_exists('category', $b)) {
        $data['cost_center'] = trim((string) ($b['costCenter'] ?? $b['category'] ?? ''));
    }
    if (array_key_exists('dueDate', $b)) $data['due_date'] = (string) $b['dueDate'];
    if (array_key_exists('amount', $b)) $data['amount'] = (float) $b['amount'];
    if (array_key_exists('status', $b)) $data['status'] = trim((string) $b['status']);
    if (array_key_exists('paymentMethod', $b)) $data['payment_method'] = trim((string) $b['paymentMethod']);
    if (array_key_exists('invoiceRef', $b) || array_key_exists('referenceCode', $b)) {
        $ref = $b['invoiceRef'] ?? $b['referenceCode'] ?? null;
        $data['invoice_ref'] = !empty($ref) ? (string) $ref : null;
    }
    return $data;
}

function buildCampaignDbRow(array $b, bool $isCreate = false): array
{
    if ($isCreate) {
        return [
            'id' => trim((string) ($b['id'] ?? ('adv-' . time()))),
            'advertiser' => trim((string) ($b['advertiser'] ?? '')),
            'title' => trim((string) ($b['title'] ?? '')),
            'ad_type' => trim((string) ($b['adType'] ?? 'Patrocínio')),
            'city' => trim((string) ($b['city'] ?? 'Franco da Rocha')),
            'placement_spec' => (string) ($b['placementSpec'] ?? ''),
            'start_date' => (string) ($b['startDate'] ?? ''),
            'end_date' => (string) ($b['endDate'] ?? ''),
            'contract_value' => (float) ($b['value'] ?? $b['contractValue'] ?? 0),
            'status' => trim((string) ($b['status'] ?? 'Programada')),
            'artwork_status' => trim((string) ($b['artworkStatus'] ?? 'Aguardando Material')),
            'creative_url' => !empty($b['creativeUrl']) ? (string) $b['creativeUrl'] : null,
            'checking_notes' => (string) ($b['checkingNotes'] ?? ''),
            'account_manager' => (string) ($b['accountManager'] ?? 'Comercial FortMídia'),
        ];
    }

    $data = [];
    if (array_key_exists('advertiser', $b)) $data['advertiser'] = trim((string) $b['advertiser']);
    if (array_key_exists('title', $b)) $data['title'] = trim((string) $b['title']);
    if (array_key_exists('adType', $b)) $data['ad_type'] = trim((string) $b['adType']);
    if (array_key_exists('city', $b)) $data['city'] = trim((string) $b['city']);
    if (array_key_exists('placementSpec', $b)) $data['placement_spec'] = (string) $b['placementSpec'];
    if (array_key_exists('startDate', $b)) $data['start_date'] = (string) $b['startDate'];
    if (array_key_exists('endDate', $b)) $data['end_date'] = (string) $b['endDate'];
    if (array_key_exists('value', $b) || array_key_exists('contractValue', $b)) {
        $data['contract_value'] = (float) ($b['value'] ?? $b['contractValue'] ?? 0);
    }
    if (array_key_exists('status', $b)) $data['status'] = trim((string) $b['status']);
    if (array_key_exists('artworkStatus', $b)) $data['artwork_status'] = trim((string) $b['artworkStatus']);
    if (array_key_exists('creativeUrl', $b)) $data['creative_url'] = !empty($b['creativeUrl']) ? (string) $b['creativeUrl'] : null;
    if (array_key_exists('checkingNotes', $b)) $data['checking_notes'] = (string) $b['checkingNotes'];
    if (array_key_exists('accountManager', $b)) $data['account_manager'] = (string) $b['accountManager'];
    return $data;
}

function buildOutdoorDbRow(array $b, bool $isCreate = false): array
{
    if ($isCreate) {
        $biweekly = (float) ($b['bimonthlyPrice'] ?? $b['biweeklyRate'] ?? 1350);
        return [
            'id' => trim((string) ($b['id'] ?? ('ooh-' . time()))),
            'code' => trim((string) ($b['code'] ?? ('OOH-' . random_int(100, 999)))),
            'city' => trim((string) ($b['city'] ?? 'Franco da Rocha')),
            'location_name' => trim((string) ($b['title'] ?? $b['locationName'] ?? '')),
            'address_reference' => (string) ($b['address'] ?? $b['addressReference'] ?? ''),
            'dimensions' => (string) ($b['dimensions'] ?? '9,00m x 3,00m'),
            'lighting' => (string) ($b['lighting'] ?? 'Iluminado (Frontlight)'),
            'lat' => (float) ($b['lat'] ?? -23.3219),
            'lng' => (float) ($b['lng'] ?? -46.7272),
            'monthly_rate' => (float) ($b['monthlyRate'] ?? ($biweekly * 1.7)),
            'biweekly_rate' => $biweekly,
            'availability' => trim((string) ($b['availability'] ?? 'Disponível')),
            'current_advertiser' => !empty($b['currentAdvertiser']) ? (string) $b['currentAdvertiser'] : null,
            'occupied_until' => !empty($b['availableFrom'] ?? $b['occupiedUntil'] ?? null)
                ? (string) ($b['availableFrom'] ?? $b['occupiedUntil'])
                : null,
            'photo_url' => (string) ($b['photoUrl'] ?? ''),
            'daily_traffic_estimate' => (string) ($b['dailyTrafficEstimate'] ?? ''),
            'notes' => !empty($b['notes']) ? (string) $b['notes'] : null,
        ];
    }

    $data = [];
    if (array_key_exists('code', $b)) $data['code'] = trim((string) $b['code']);
    if (array_key_exists('city', $b)) $data['city'] = trim((string) $b['city']);
    if (array_key_exists('title', $b) || array_key_exists('locationName', $b)) {
        $data['location_name'] = trim((string) ($b['title'] ?? $b['locationName'] ?? ''));
    }
    if (array_key_exists('address', $b) || array_key_exists('addressReference', $b)) {
        $data['address_reference'] = (string) ($b['address'] ?? $b['addressReference'] ?? '');
    }
    if (array_key_exists('dimensions', $b)) $data['dimensions'] = (string) $b['dimensions'];
    if (array_key_exists('lighting', $b)) $data['lighting'] = (string) $b['lighting'];
    if (array_key_exists('lat', $b)) $data['lat'] = (float) $b['lat'];
    if (array_key_exists('lng', $b)) $data['lng'] = (float) $b['lng'];
    if (array_key_exists('monthlyRate', $b)) $data['monthly_rate'] = (float) $b['monthlyRate'];
    if (array_key_exists('bimonthlyPrice', $b) || array_key_exists('biweeklyRate', $b)) {
        $data['biweekly_rate'] = (float) ($b['bimonthlyPrice'] ?? $b['biweeklyRate'] ?? 0);
    }
    if (array_key_exists('availability', $b)) $data['availability'] = trim((string) $b['availability']);
    if (array_key_exists('currentAdvertiser', $b)) $data['current_advertiser'] = !empty($b['currentAdvertiser']) ? (string) $b['currentAdvertiser'] : null;
    if (array_key_exists('availableFrom', $b) || array_key_exists('occupiedUntil', $b)) {
        $until = $b['availableFrom'] ?? $b['occupiedUntil'] ?? null;
        $data['occupied_until'] = !empty($until) ? (string) $until : null;
    }
    if (array_key_exists('photoUrl', $b)) $data['photo_url'] = (string) $b['photoUrl'];
    if (array_key_exists('dailyTrafficEstimate', $b)) $data['daily_traffic_estimate'] = (string) $b['dailyTrafficEstimate'];
    if (array_key_exists('notes', $b)) $data['notes'] = !empty($b['notes']) ? (string) $b['notes'] : null;
    return $data;
}

function buildCitizenReportDbRow(array $b, bool $isCreate = false): array
{
    if ($isCreate) {
        return [
            'id' => trim((string) ($b['id'] ?? ('rep-' . time()))),
            'protocol' => trim((string) ($b['protocol'] ?? ('FC-' . date('Y') . '-' . random_int(1000, 9999)))),
            'citizen_name' => trim((string) ($b['citizenName'] ?? 'Cidadão')),
            'contact' => trim((string) ($b['contact'] ?? '')),
            'city' => trim((string) ($b['city'] ?? 'Franco da Rocha')),
            'neighborhood' => trim((string) ($b['neighborhood'] ?? '')),
            'category' => trim((string) ($b['category'] ?? 'Zeladoria & Infraestrutura')),
            'urgency' => trim((string) ($b['urgency'] ?? 'Normal')),
            'title' => trim((string) ($b['title'] ?? '')),
            'description' => trim((string) ($b['description'] ?? '')),
            'status' => trim((string) ($b['status'] ?? 'Aguardando Triagem')),
            'triage_score' => isset($b['triageScore']) ? (int) $b['triageScore'] : null,
            'assigned_editor' => !empty($b['assignedEditor']) ? (string) $b['assignedEditor'] : null,
            'official_response_note' => !empty($b['officialResponseNote']) ? (string) $b['officialResponseNote'] : null,
            'response_author' => !empty($b['responseAuthor']) ? (string) $b['responseAuthor'] : null,
            'response_sent_at' => !empty($b['responseSentAt']) ? (string) $b['responseSentAt'] : null,
            'forwarded_at' => !empty($b['forwardedAt']) ? (string) $b['forwardedAt'] : null,
            'forwarded_to' => !empty($b['forwardedTo']) ? (string) $b['forwardedTo'] : null,
            'created_at_label' => (string) ($b['createdAt'] ?? date('d/m/Y · H:i')),
        ];
    }

    $data = [];
    if (array_key_exists('citizenName', $b)) $data['citizen_name'] = trim((string) $b['citizenName']);
    if (array_key_exists('contact', $b)) $data['contact'] = trim((string) $b['contact']);
    if (array_key_exists('city', $b)) $data['city'] = trim((string) $b['city']);
    if (array_key_exists('neighborhood', $b)) $data['neighborhood'] = trim((string) $b['neighborhood']);
    if (array_key_exists('category', $b)) $data['category'] = trim((string) $b['category']);
    if (array_key_exists('urgency', $b)) $data['urgency'] = trim((string) $b['urgency']);
    if (array_key_exists('title', $b)) $data['title'] = trim((string) $b['title']);
    if (array_key_exists('description', $b)) $data['description'] = trim((string) $b['description']);
    if (array_key_exists('status', $b)) $data['status'] = trim((string) $b['status']);
    if (array_key_exists('triageScore', $b)) $data['triage_score'] = $b['triageScore'] !== null ? (int) $b['triageScore'] : null;
    if (array_key_exists('assignedEditor', $b)) $data['assigned_editor'] = !empty($b['assignedEditor']) ? (string) $b['assignedEditor'] : null;
    if (array_key_exists('officialResponseNote', $b)) $data['official_response_note'] = !empty($b['officialResponseNote']) ? (string) $b['officialResponseNote'] : null;
    if (array_key_exists('responseAuthor', $b)) $data['response_author'] = !empty($b['responseAuthor']) ? (string) $b['responseAuthor'] : null;
    if (array_key_exists('responseSentAt', $b)) $data['response_sent_at'] = !empty($b['responseSentAt']) ? (string) $b['responseSentAt'] : null;
    if (array_key_exists('forwardedAt', $b)) $data['forwarded_at'] = !empty($b['forwardedAt']) ? (string) $b['forwardedAt'] : null;
    if (array_key_exists('forwardedTo', $b)) $data['forwarded_to'] = !empty($b['forwardedTo']) ? (string) $b['forwardedTo'] : null;
    return $data;
}

// ----------------------------------------------------------------------------
// 5. Resolução da Rota (/api/...)
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
$subResource = isset($segments[1]) ? urldecode($segments[1]) : null;
$subItemId = isset($segments[2]) ? urldecode($segments[2]) : null;
$reservedSubRoutes = ['leads', 'contracts', 'tasks', 'login', 'me', 'logout', 'setup-admin', 'seed'];
$itemId = $subItemId !== null
    ? $subItemId
    : ($subResource !== null && !in_array($subResource, $reservedSubRoutes, true) ? $subResource : null);

// ----------------------------------------------------------------------------
// 6. Rotas Públicas de Diagnóstico & Config
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

// Estado público somente leitura para os portais FortMídia e FortNews (desktop e celular)
if ($resource === 'public-state' && $method === 'GET') {
    $pdo = getPdo($config);
    $publicState = [];

    if (getTableColumns($pdo, 'app_state_snapshots') !== []) {
        $stmt = $pdo->prepare(
            'SELECT payload_json FROM app_state_snapshots WHERE snapshot_key = :k LIMIT 1'
        );
        $stmt->execute([':k' => 'fortmidia_portal_state']);
        $row = $stmt->fetch();
        if ($row && !empty($row['payload_json'])) {
            $decoded = json_decode((string) $row['payload_json'], true);
            if (is_array($decoded)) {
                $publicAllowlist = [
                    'siteSettings',
                    'newsPortalSettings',
                    'siteAdBanners',
                    'siteAdsConfig',
                    'podcastShows',
                    'quotas',
                    'galleryItems',
                    'popupConfig',
                ];
                foreach ($publicAllowlist as $key) {
                    if (array_key_exists($key, $decoded)) {
                        $publicState[$key] = $decoded[$key];
                    }
                }
            }
        }
    }

    if (getTableColumns($pdo, 'outdoor_points') !== []) {
        $outdoorRows = $pdo->query('SELECT * FROM outdoor_points ORDER BY code ASC LIMIT 300')->fetchAll();
        if (count($outdoorRows) > 0) {
            $publicState['outdoorPoints'] = array_map('formatOutdoorRow', $outdoorRows);
        }
    }

    jsonResponse(200, ['state' => $publicState]);
}

// ----------------------------------------------------------------------------
// 7. Autenticação (/api/auth/setup-admin, /login, /me, /logout)
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
        $rawUsername = trim((string) ($body['username'] ?? ''));
        $username = normalizeSimpleLogin($rawUsername);
        $password = (string) ($body['password'] ?? '');

        if ($username === '' || $password === '') {
            jsonResponse(400, ['error' => 'Informe usuário e senha para continuar.']);
        }

        // Busca todos os usuários e compara com normalização (nome simples, primeiro nome, login_name, e-mail ou prefixo)
        $allUsers = $pdo->query('SELECT * FROM users ORDER BY hierarchy_level ASC, id ASC')->fetchAll();
        $candidates = [];
        foreach ($allUsers as $u) {
            $uEmail = normalizeSimpleLogin((string) ($u['email'] ?? ''));
            $uPrefix = str_contains($uEmail, '@') ? explode('@', $uEmail)[0] : $uEmail;
            $uLogin = normalizeSimpleLogin((string) ($u['login_name'] ?? ''));
            $uName = normalizeSimpleLogin((string) ($u['name'] ?? ''));
            $uFirst = explode(' ', $uName)[0] ?? '';
            $isSuper = ((int) ($u['hierarchy_level'] ?? 99)) === 1;

            if (
                ($uLogin !== '' && $username === $uLogin) ||
                ($uEmail !== '' && $username === $uEmail) ||
                ($uPrefix !== '' && $username === $uPrefix) ||
                ($uName !== '' && $username === $uName) ||
                ($uFirst !== '' && $username === $uFirst) ||
                ($isSuper && in_array($username, ['admin', 'diretoria'], true))
            ) {
                $candidates[] = $u;
            }
        }

        $matchedRow = null;
        foreach ($candidates as $cand) {
            if (password_verify($password, (string) ($cand['password_hash'] ?? ''))) {
                $matchedRow = $cand;
                break;
            }
        }

        if (!$matchedRow) {
            jsonResponse(401, ['error' => 'Usuário ou senha inválidos.']);
        }
        if (!(bool) $matchedRow['active']) {
            jsonResponse(403, ['error' => 'Este usuário encontra-se inativo.']);
        }

        ensureUserSessionsTable($pdo);
        $rawToken = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $rawToken);
        $ttlHours = max(24, (int) ($config['session_ttl_hours'] ?? 720));
        $ttlSeconds = $ttlHours * 3600;
        $expiresAt = gmdate('Y-m-d H:i:s', time() + $ttlSeconds);

        $ins = $pdo->prepare(
            'INSERT INTO user_sessions (user_id, token_hash, ip_address, user_agent, expires_at)
             VALUES (:user_id, :token_hash, :ip, :ua, :expires_at)'
        );
        $ins->execute([
            ':user_id' => $matchedRow['id'],
            ':token_hash' => $tokenHash,
            ':ip' => substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64),
            ':ua' => substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255),
            ':expires_at' => $expiresAt,
        ]);

        setSessionCookie($rawToken, $ttlSeconds);

        jsonResponse(200, [
            'token' => $rawToken,
            'expiresAt' => $expiresAt,
            'user' => formatUserRow($matchedRow),
        ]);
    }

    if ($subResource === 'me' && $method === 'GET') {
        $user = requireAuth($pdo);
        // Renova janela deslizante da sessão (30 dias) para manter permanência no refresh (desktop e mobile)
        $currentToken = extractSessionToken();
        if ($currentToken !== null) {
            $ttlHours = max(24, (int) ($config['session_ttl_hours'] ?? 720));
            $ttlSeconds = $ttlHours * 3600;
            $newExpiresAt = gmdate('Y-m-d H:i:s', time() + $ttlSeconds);
            try {
                $upd = $pdo->prepare('UPDATE user_sessions SET expires_at = :exp WHERE token_hash = :th');
                $upd->execute([
                    ':exp' => $newExpiresAt,
                    ':th' => hash('sha256', $currentToken),
                ]);
                setSessionCookie($currentToken, $ttlSeconds);
            } catch (Throwable) {
                // Não interrompe retorno de /auth/me caso a renovação falhe
            }
        }
        jsonResponse(200, ['user' => $user, 'sessionActive' => true]);
    }

    if ($subResource === 'logout' && $method === 'POST') {
        $token = extractSessionToken();
        if ($token !== null) {
            $stmt = $pdo->prepare('DELETE FROM user_sessions WHERE token_hash = :token_hash');
            $stmt->execute([':token_hash' => hash('sha256', $token)]);
        }
        clearSessionCookie();
        jsonResponse(200, ['ok' => true]);
    }

    jsonResponse(404, ['error' => 'Endpoint de autenticação não encontrado.']);
}

// ----------------------------------------------------------------------------
// 8. Sincronização de Snapshot Completo (/api/state)
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
// 9. Rotina de Carga Inicial no MySQL (/api/sync/seed) — Super Admin / Admin
// ----------------------------------------------------------------------------
if ($resource === 'sync' && $subResource === 'seed' && $method === 'POST') {
    $pdo = getPdo($config);
    $admin = requireAdmin($pdo);
    $body = readJsonBody();

    $inserted = [
        'contracts' => 0,
        'leads' => 0,
        'users' => 0,
        'pautas' => 0,
        'financialEntries' => 0,
        'campaigns' => 0,
        'outdoors' => 0,
        'citizenReports' => 0,
        'clientTasks' => 0,
    ];

    try {
        foreach ((array) ($body['contracts'] ?? []) as $row) {
            if (!is_array($row)) continue;
            $inserted['contracts'] += insertFilteredRow($pdo, 'crm_contracts', buildContractDbRow($row, true), true);
        }

        foreach ((array) ($body['leads'] ?? []) as $row) {
            if (!is_array($row)) continue;
            $inserted['leads'] += insertFilteredRow($pdo, 'crm_leads', buildLeadDbRow($row, true), true);
        }

        foreach ((array) ($body['pautas'] ?? []) as $row) {
            if (!is_array($row)) continue;
            $inserted['pautas'] += insertFilteredRow($pdo, 'news_pautas', buildPautaDbRow($row, true), true);
        }

        if (getTableColumns($pdo, 'financial_entries') !== []) {
            foreach ((array) ($body['financialEntries'] ?? []) as $row) {
                if (!is_array($row)) continue;
                $inserted['financialEntries'] += insertFilteredRow($pdo, 'financial_entries', buildFinancialDbRow($row, true), true);
            }
        }

        if (getTableColumns($pdo, 'campaigns') !== []) {
            foreach ((array) ($body['campaigns'] ?? []) as $row) {
                if (!is_array($row)) continue;
                $inserted['campaigns'] += insertFilteredRow($pdo, 'campaigns', buildCampaignDbRow($row, true), true);
            }
        }

        if (getTableColumns($pdo, 'outdoor_points') !== []) {
            foreach ((array) ($body['outdoors'] ?? []) as $row) {
                if (!is_array($row)) continue;
                $inserted['outdoors'] += insertFilteredRow($pdo, 'outdoor_points', buildOutdoorDbRow($row, true), true);
            }
        }

        foreach ((array) ($body['citizenReports'] ?? []) as $row) {
            if (!is_array($row)) continue;
            $inserted['citizenReports'] += insertFilteredRow($pdo, 'citizen_reports', buildCitizenReportDbRow($row, true), true);
        }

        if (getTableColumns($pdo, 'crm_client_tasks') !== []) {
            foreach ((array) ($body['clientTasks'] ?? []) as $row) {
                if (!is_array($row)) continue;
                $inserted['clientTasks'] += insertFilteredRow($pdo, 'crm_client_tasks', buildTaskDbRow($row, true), true);
            }
        }

        // Usuários iniciais: INSERT IGNORE garante que o Super Admin real já cadastrado nunca seja sobrescrito
        ensureUsersLoginNameColumn($pdo);
        foreach ((array) ($body['users'] ?? []) as $row) {
            if (!is_array($row)) continue;
            $email = strtolower(trim((string) ($row['email'] ?? '')));
            $rawLogin = trim((string) ($row['loginName'] ?? ''));
            $rawPass = (string) ($row['password'] ?? '');
            $loginSlug = $rawLogin !== ''
                ? slugifyLoginName($rawLogin)
                : ($email !== '' && str_contains($email, '@')
                    ? slugifyLoginName(explode('@', $email)[0])
                    : slugifyLoginName(explode(' ', (string) ($row['name'] ?? ''))[0]));
            if ($email === '' && $loginSlug !== '') {
                $email = $loginSlug . '@fortmidia.local';
            }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($rawPass) < 6) {
                continue;
            }
            $userDbRow = [
                'id' => trim((string) ($row['id'] ?? ('usr-' . bin2hex(random_bytes(4))))),
                'name' => trim((string) ($row['name'] ?? 'Membro FortMídia')),
                'login_name' => $loginSlug !== '' ? $loginSlug : null,
                'role' => trim((string) ($row['role'] ?? 'Executivo Comercial')),
                'hierarchy_level' => (int) ($row['hierarchyLevel'] ?? 4),
                'department' => trim((string) ($row['department'] ?? 'Operações FortMídia')),
                'email' => $email,
                'phone' => trim((string) ($row['phone'] ?? '')),
                'password_hash' => password_hash($rawPass, PASSWORD_BCRYPT),
                'avatar_url' => (string) ($row['avatarUrl'] ?? ''),
                'bio' => (string) ($row['bio'] ?? ''),
                'linked_client_name' => !empty($row['linkedClientName']) ? (string) $row['linkedClientName'] : null,
                'allowed_modules_json' => json_encode($row['allowedModules'] ?? [], JSON_UNESCAPED_UNICODE),
                'permissions_json' => json_encode($row['permissions'] ?? [], JSON_UNESCAPED_UNICODE),
                'active' => !isset($row['active']) || $row['active'] ? 1 : 0,
            ];
            $inserted['users'] += insertFilteredRow($pdo, 'users', $userDbRow, true);
        }

        if (isset($body['stateSnapshot']) && is_array($body['stateSnapshot']) && getTableColumns($pdo, 'app_state_snapshots') !== []) {
            $encoded = json_encode($body['stateSnapshot'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $stmt = $pdo->prepare(
                'INSERT INTO app_state_snapshots (snapshot_key, payload_json, updated_by)
                 VALUES (:k, :payload, :uid)
                 ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json), updated_by = VALUES(updated_by)'
            );
            $stmt->execute([
                ':k' => 'fortmidia_portal_state',
                ':payload' => $encoded,
                ':uid' => $admin['id'],
            ]);
        }

        jsonResponse(200, [
            'ok' => true,
            'inserted' => $inserted,
            'message' => 'Sincronização inicial concluída no MySQL.',
        ]);
    } catch (Throwable) {
        jsonResponse(500, [
            'error' => 'Falha ao gravar dados iniciais no MySQL. Verifique se todas as tabelas do schema.sql foram importadas.',
        ]);
    }
}

// ----------------------------------------------------------------------------
// 10. Notícias & Pautas (/api/pautas)
// ----------------------------------------------------------------------------
if ($resource === 'pautas') {
    $pdo = getPdo($config);

    if ($method === 'GET') {
        $user = getAuthenticatedUser($pdo);
        if ($user !== null) {
            $rows = $pdo->query('SELECT * FROM news_pautas ORDER BY created_at DESC LIMIT 300')->fetchAll();
        } else {
            $stmt = $pdo->prepare(
                'SELECT * FROM news_pautas WHERE approval_status = :status ORDER BY created_at DESC LIMIT 150'
            );
            $stmt->execute([':status' => 'Publicada no Site']);
            $rows = $stmt->fetchAll();
        }
        jsonResponse(200, ['items' => array_map('formatPautaRow', $rows)]);
    }

    requireAuth($pdo);

    if ($method === 'POST') {
        $b = readJsonBody();
        $row = buildPautaDbRow($b, true);
        insertFilteredRow($pdo, 'news_pautas', $row, false);
        $stmt = $pdo->prepare('SELECT * FROM news_pautas WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $row['id']]);
        $saved = $stmt->fetch();
        jsonResponse(201, ['item' => $saved ? formatPautaRow($saved) : array_merge($b, ['id' => $row['id']])]);
    }

    if (($method === 'PUT' || $method === 'PATCH') && $itemId) {
        $b = readJsonBody();
        $patch = buildPautaDbRow($b, false);
        updateFilteredRow($pdo, 'news_pautas', $itemId, $patch);
        $stmt = $pdo->prepare('SELECT * FROM news_pautas WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $itemId]);
        $saved = $stmt->fetch();
        jsonResponse(200, ['ok' => true, 'item' => $saved ? formatPautaRow($saved) : null]);
    }

    if ($method === 'DELETE' && $itemId) {
        $stmt = $pdo->prepare('DELETE FROM news_pautas WHERE id = :id');
        $stmt->execute([':id' => $itemId]);
        jsonResponse(200, ['ok' => true]);
    }
}

// ----------------------------------------------------------------------------
// 11. Demandas Cidadãs — Canal Fala Cidadão (/api/demandas)
// ----------------------------------------------------------------------------
if ($resource === 'demandas') {
    $pdo = getPdo($config);

    // Envio público pelo formulário Fala Cidadão
    if ($method === 'POST') {
        $b = readJsonBody();
        $row = buildCitizenReportDbRow($b, true);
        insertFilteredRow($pdo, 'citizen_reports', $row, false);
        $stmt = $pdo->prepare('SELECT * FROM citizen_reports WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $row['id']]);
        $saved = $stmt->fetch();
        jsonResponse(201, ['item' => $saved ? formatCitizenReportRow($saved) : array_merge($b, ['id' => $row['id'], 'protocol' => $row['protocol']])]);
    }

    requireAuth($pdo);

    if ($method === 'GET') {
        $rows = $pdo->query('SELECT * FROM citizen_reports ORDER BY created_at DESC LIMIT 300')->fetchAll();
        jsonResponse(200, ['items' => array_map('formatCitizenReportRow', $rows)]);
    }

    if (($method === 'PUT' || $method === 'PATCH') && $itemId) {
        $b = readJsonBody();
        $patch = buildCitizenReportDbRow($b, false);
        updateFilteredRow($pdo, 'citizen_reports', $itemId, $patch);
        $stmt = $pdo->prepare('SELECT * FROM citizen_reports WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $itemId]);
        $saved = $stmt->fetch();
        jsonResponse(200, ['ok' => true, 'item' => $saved ? formatCitizenReportRow($saved) : null]);
    }

    if ($method === 'DELETE' && $itemId) {
        $stmt = $pdo->prepare('DELETE FROM citizen_reports WHERE id = :id');
        $stmt->execute([':id' => $itemId]);
        jsonResponse(200, ['ok' => true]);
    }
}

// ----------------------------------------------------------------------------
// 12. CRM — Leads, Contratos & Pipeline de Clientes (/api/clientes/*)
// ----------------------------------------------------------------------------
if ($resource === 'clientes') {
    $pdo = getPdo($config);

    if ($subResource === 'leads') {
        // Envio público de lead pelo site FortMídia ou autenticado no painel
        if ($method === 'POST') {
            $b = readJsonBody();
            $row = buildLeadDbRow($b, true);
            insertFilteredRow($pdo, 'crm_leads', $row, false);
            $stmt = $pdo->prepare('SELECT * FROM crm_leads WHERE id = :id LIMIT 1');
            $stmt->execute([':id' => $row['id']]);
            $saved = $stmt->fetch();
            jsonResponse(201, ['item' => $saved ? formatLeadRow($saved) : array_merge($b, ['id' => $row['id']])]);
        }

        requireAuth($pdo);

        if ($method === 'GET') {
            $rows = $pdo->query('SELECT * FROM crm_leads ORDER BY created_at DESC LIMIT 300')->fetchAll();
            jsonResponse(200, ['items' => array_map('formatLeadRow', $rows)]);
        }

        if (($method === 'PUT' || $method === 'PATCH') && $itemId) {
            $b = readJsonBody();
            $patch = buildLeadDbRow($b, false);
            updateFilteredRow($pdo, 'crm_leads', $itemId, $patch);
            $stmt = $pdo->prepare('SELECT * FROM crm_leads WHERE id = :id LIMIT 1');
            $stmt->execute([':id' => $itemId]);
            $saved = $stmt->fetch();
            jsonResponse(200, ['ok' => true, 'item' => $saved ? formatLeadRow($saved) : null]);
        }

        if ($method === 'DELETE' && $itemId) {
            $stmt = $pdo->prepare('DELETE FROM crm_leads WHERE id = :id');
            $stmt->execute([':id' => $itemId]);
            jsonResponse(200, ['ok' => true]);
        }
    }

    if ($subResource === 'contracts') {
        requireAuth($pdo);

        if ($method === 'GET') {
            $rows = $pdo->query('SELECT * FROM crm_contracts ORDER BY created_at DESC LIMIT 300')->fetchAll();
            jsonResponse(200, ['items' => array_map('formatContractRow', $rows)]);
        }

        if ($method === 'POST') {
            $b = readJsonBody();
            $row = buildContractDbRow($b, true);
            if ($row['client'] === '') {
                jsonResponse(400, ['error' => 'Informe o nome do cliente para salvar o contrato.']);
            }
            insertFilteredRow($pdo, 'crm_contracts', $row, false);
            $stmt = $pdo->prepare('SELECT * FROM crm_contracts WHERE id = :id LIMIT 1');
            $stmt->execute([':id' => $row['id']]);
            $saved = $stmt->fetch();
            jsonResponse(201, ['item' => $saved ? formatContractRow($saved) : array_merge($b, ['id' => $row['id']])]);
        }

        if (($method === 'PUT' || $method === 'PATCH') && $itemId) {
            $b = readJsonBody();
            $patch = buildContractDbRow($b, false);
            updateFilteredRow($pdo, 'crm_contracts', $itemId, $patch);
            $stmt = $pdo->prepare('SELECT * FROM crm_contracts WHERE id = :id LIMIT 1');
            $stmt->execute([':id' => $itemId]);
            $saved = $stmt->fetch();
            jsonResponse(200, ['ok' => true, 'item' => $saved ? formatContractRow($saved) : null]);
        }

        if ($method === 'DELETE' && $itemId) {
            $stmt = $pdo->prepare('DELETE FROM crm_contracts WHERE id = :id');
            $stmt->execute([':id' => $itemId]);
            jsonResponse(200, ['ok' => true]);
        }
    }

    if ($subResource === 'tasks') {
        requireAuth($pdo);

        if ($method === 'GET') {
            $rows = $pdo->query('SELECT * FROM crm_client_tasks ORDER BY created_at DESC LIMIT 300')->fetchAll();
            jsonResponse(200, ['items' => array_map('formatTaskRow', $rows)]);
        }

        if ($method === 'POST') {
            $b = readJsonBody();
            $row = buildTaskDbRow($b, true);
            insertFilteredRow($pdo, 'crm_client_tasks', $row, false);
            $stmt = $pdo->prepare('SELECT * FROM crm_client_tasks WHERE id = :id LIMIT 1');
            $stmt->execute([':id' => $row['id']]);
            $saved = $stmt->fetch();
            jsonResponse(201, ['item' => $saved ? formatTaskRow($saved) : array_merge($b, ['id' => $row['id']])]);
        }

        if (($method === 'PUT' || $method === 'PATCH') && $itemId) {
            $b = readJsonBody();
            $patch = buildTaskDbRow($b, false);
            updateFilteredRow($pdo, 'crm_client_tasks', $itemId, $patch);
            $stmt = $pdo->prepare('SELECT * FROM crm_client_tasks WHERE id = :id LIMIT 1');
            $stmt->execute([':id' => $itemId]);
            $saved = $stmt->fetch();
            jsonResponse(200, ['ok' => true, 'item' => $saved ? formatTaskRow($saved) : null]);
        }

        if ($method === 'DELETE' && $itemId) {
            $stmt = $pdo->prepare('DELETE FROM crm_client_tasks WHERE id = :id');
            $stmt->execute([':id' => $itemId]);
            jsonResponse(200, ['ok' => true]);
        }
    }
}

// ----------------------------------------------------------------------------
// 13. Financeiro de Agência (/api/financeiro)
// ----------------------------------------------------------------------------
if ($resource === 'financeiro') {
    $pdo = getPdo($config);
    requireAuth($pdo);

    if ($method === 'GET') {
        $rows = $pdo->query('SELECT * FROM financial_entries ORDER BY created_at DESC LIMIT 400')->fetchAll();
        jsonResponse(200, ['items' => array_map('formatFinancialRow', $rows)]);
    }

    if ($method === 'POST') {
        $b = readJsonBody();
        $row = buildFinancialDbRow($b, true);
        insertFilteredRow($pdo, 'financial_entries', $row, false);
        $stmt = $pdo->prepare('SELECT * FROM financial_entries WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $row['id']]);
        $saved = $stmt->fetch();
        jsonResponse(201, ['item' => $saved ? formatFinancialRow($saved) : array_merge($b, ['id' => $row['id']])]);
    }

    if (($method === 'PUT' || $method === 'PATCH') && $itemId) {
        $b = readJsonBody();
        $patch = buildFinancialDbRow($b, false);
        updateFilteredRow($pdo, 'financial_entries', $itemId, $patch);
        $stmt = $pdo->prepare('SELECT * FROM financial_entries WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $itemId]);
        $saved = $stmt->fetch();
        jsonResponse(200, ['ok' => true, 'item' => $saved ? formatFinancialRow($saved) : null]);
    }

    if ($method === 'DELETE' && $itemId) {
        $stmt = $pdo->prepare('DELETE FROM financial_entries WHERE id = :id');
        $stmt->execute([':id' => $itemId]);
        jsonResponse(200, ['ok' => true]);
    }
}

// ----------------------------------------------------------------------------
// 14. Campanhas de Publicidade (/api/campanhas)
// ----------------------------------------------------------------------------
if ($resource === 'campanhas') {
    $pdo = getPdo($config);
    requireAuth($pdo);

    if ($method === 'GET') {
        $rows = $pdo->query('SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 300')->fetchAll();
        jsonResponse(200, ['items' => array_map('formatCampaignRow', $rows)]);
    }

    if ($method === 'POST') {
        $b = readJsonBody();
        $row = buildCampaignDbRow($b, true);
        insertFilteredRow($pdo, 'campaigns', $row, false);
        $stmt = $pdo->prepare('SELECT * FROM campaigns WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $row['id']]);
        $saved = $stmt->fetch();
        jsonResponse(201, ['item' => $saved ? formatCampaignRow($saved) : array_merge($b, ['id' => $row['id']])]);
    }

    if (($method === 'PUT' || $method === 'PATCH') && $itemId) {
        $b = readJsonBody();
        $patch = buildCampaignDbRow($b, false);
        updateFilteredRow($pdo, 'campaigns', $itemId, $patch);
        $stmt = $pdo->prepare('SELECT * FROM campaigns WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $itemId]);
        $saved = $stmt->fetch();
        jsonResponse(200, ['ok' => true, 'item' => $saved ? formatCampaignRow($saved) : null]);
    }

    if ($method === 'DELETE' && $itemId) {
        $stmt = $pdo->prepare('DELETE FROM campaigns WHERE id = :id');
        $stmt->execute([':id' => $itemId]);
        jsonResponse(200, ['ok' => true]);
    }
}

// ----------------------------------------------------------------------------
// 15. Inventário OOH — Outdoors (/api/outdoors)
// ----------------------------------------------------------------------------
if ($resource === 'outdoors') {
    $pdo = getPdo($config);
    requireAuth($pdo);

    if ($method === 'GET') {
        $rows = $pdo->query('SELECT * FROM outdoor_points ORDER BY code ASC LIMIT 300')->fetchAll();
        jsonResponse(200, ['items' => array_map('formatOutdoorRow', $rows)]);
    }

    if ($method === 'POST') {
        $b = readJsonBody();
        $row = buildOutdoorDbRow($b, true);
        insertFilteredRow($pdo, 'outdoor_points', $row, false);
        $stmt = $pdo->prepare('SELECT * FROM outdoor_points WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $row['id']]);
        $saved = $stmt->fetch();
        jsonResponse(201, ['item' => $saved ? formatOutdoorRow($saved) : array_merge($b, ['id' => $row['id']])]);
    }

    if (($method === 'PUT' || $method === 'PATCH') && $itemId) {
        $b = readJsonBody();
        $patch = buildOutdoorDbRow($b, false);
        updateFilteredRow($pdo, 'outdoor_points', $itemId, $patch);
        $stmt = $pdo->prepare('SELECT * FROM outdoor_points WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $itemId]);
        $saved = $stmt->fetch();
        jsonResponse(200, ['ok' => true, 'item' => $saved ? formatOutdoorRow($saved) : null]);
    }

    if ($method === 'DELETE' && $itemId) {
        $stmt = $pdo->prepare('DELETE FROM outdoor_points WHERE id = :id');
        $stmt->execute([':id' => $itemId]);
        jsonResponse(200, ['ok' => true]);
    }
}

// ----------------------------------------------------------------------------
// 16. Usuários (/api/usuarios) — Gestão protegida (senhas exclusivas Super Admin)
// ----------------------------------------------------------------------------
if ($resource === 'usuarios') {
    $pdo = getPdo($config);
    $currentAdmin = requireAdmin($pdo);
    $userCols = ensureUsersLoginNameColumn($pdo);
    $selectUserCols = 'id, name, ' . (isset($userCols['login_name']) ? 'login_name, ' : '') .
        'role, hierarchy_level, department, email, phone, avatar_url, bio, linked_client_name, allowed_modules_json, permissions_json, active';

    if ($method === 'GET') {
        $rows = $pdo->query(
            "SELECT {$selectUserCols} FROM users ORDER BY hierarchy_level ASC, name ASC"
        )->fetchAll();
        jsonResponse(200, ['items' => array_map('formatUserRow', $rows)]);
    }

    if ($method === 'POST') {
        // Apenas Super Admin pode cadastrar usuários e criar senhas de acesso
        requireSuperAdmin($pdo);

        $b = readJsonBody();
        $name = trim((string) ($b['name'] ?? ''));
        $rawLogin = trim((string) ($b['loginName'] ?? ''));
        $email = strtolower(trim((string) ($b['email'] ?? '')));
        $password = (string) ($b['password'] ?? '');

        if ($name === '') {
            jsonResponse(400, ['error' => 'Informe o nome do usuário.']);
        }

        $loginSlug = $rawLogin !== ''
            ? slugifyLoginName($rawLogin)
            : ($email !== '' && str_contains($email, '@')
                ? slugifyLoginName(explode('@', $email)[0])
                : slugifyLoginName(explode(' ', $name)[0]));

        if ($email === '' && $loginSlug !== '') {
            $email = $loginSlug . '@fortmidia.local';
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonResponse(400, ['error' => 'Informe um nome de login simples ou e-mail válido.']);
        }
        if (strlen($password) < 6) {
            jsonResponse(400, ['error' => 'A senha de acesso deve ter pelo menos 6 caracteres.']);
        }

        $id = trim((string) ($b['id'] ?? ('usr-' . time())));
        $userDbRow = [
            'id' => $id,
            'name' => $name,
            'login_name' => $loginSlug !== '' ? $loginSlug : null,
            'role' => trim((string) ($b['role'] ?? 'Executivo Comercial')),
            'hierarchy_level' => (int) ($b['hierarchyLevel'] ?? 4),
            'department' => trim((string) ($b['department'] ?? 'Operações FortMídia')),
            'email' => $email,
            'phone' => trim((string) ($b['phone'] ?? '')),
            'password_hash' => password_hash($password, PASSWORD_BCRYPT),
            'avatar_url' => (string) ($b['avatarUrl'] ?? ''),
            'bio' => (string) ($b['bio'] ?? ''),
            'linked_client_name' => !empty($b['linkedClientName']) ? (string) $b['linkedClientName'] : null,
            'allowed_modules_json' => json_encode($b['allowedModules'] ?? [], JSON_UNESCAPED_UNICODE),
            'permissions_json' => json_encode($b['permissions'] ?? [], JSON_UNESCAPED_UNICODE),
            'active' => !isset($b['active']) || $b['active'] ? 1 : 0,
        ];

        try {
            insertFilteredRow($pdo, 'users', $userDbRow, false);
        } catch (PDOException $e) {
            if ((string) $e->getCode() === '23000') {
                jsonResponse(409, ['error' => 'Já existe um usuário cadastrado com este nome de login ou e-mail.']);
            }
            jsonResponse(500, ['error' => 'Erro ao cadastrar usuário no MySQL.']);
        }

        $sel = $pdo->prepare("SELECT {$selectUserCols} FROM users WHERE id = :id LIMIT 1");
        $sel->execute([':id' => $id]);
        $saved = $sel->fetch();
        jsonResponse(201, ['ok' => true, 'id' => $id, 'item' => $saved ? formatUserRow($saved) : null]);
    }

    if (($method === 'PUT' || $method === 'PATCH') && $itemId) {
        $b = readJsonBody();
        $actorIsSuperAdmin = ((int) ($currentAdmin['hierarchyLevel'] ?? 99)) === 1;

        $checkStmt = $pdo->prepare('SELECT id, hierarchy_level, email FROM users WHERE id = :id LIMIT 1');
        $checkStmt->execute([':id' => $itemId]);
        $existingUser = $checkStmt->fetch();

        // Se o registro ainda não existir fisicamente na tabela `users`, força gravação via INSERT (somente Super Admin)
        if (!$existingUser) {
            if (!$actorIsSuperAdmin) {
                jsonResponse(403, ['error' => 'Apenas o Super Admin pode gravar novas credenciais na tabela users.']);
            }
            $name = trim((string) ($b['name'] ?? ''));
            $rawLogin = trim((string) ($b['loginName'] ?? ''));
            $email = strtolower(trim((string) ($b['email'] ?? '')));
            $password = trim((string) ($b['password'] ?? ''));

            if ($name === '') {
                jsonResponse(400, ['error' => 'Informe o nome do usuário para gravar na tabela users.']);
            }
            if (strlen($password) < 6) {
                jsonResponse(400, [
                    'error' => 'Este usuário ainda não está gravado na tabela users do MySQL. Defina uma senha (mín. 6 caracteres) para salvar as credenciais.',
                ]);
            }

            $loginSlug = $rawLogin !== ''
                ? slugifyLoginName($rawLogin)
                : ($email !== '' && str_contains($email, '@')
                    ? slugifyLoginName(explode('@', $email)[0])
                    : slugifyLoginName(explode(' ', $name)[0]));
            if ($email === '' && $loginSlug !== '') {
                $email = $loginSlug . '@fortmidia.local';
            }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                jsonResponse(400, ['error' => 'Informe um nome de login simples ou e-mail válido.']);
            }

            $userDbRow = [
                'id' => $itemId,
                'name' => $name,
                'login_name' => $loginSlug !== '' ? $loginSlug : null,
                'role' => trim((string) ($b['role'] ?? 'Executivo Comercial')),
                'hierarchy_level' => (int) ($b['hierarchyLevel'] ?? 4),
                'department' => trim((string) ($b['department'] ?? 'Operações FortMídia')),
                'email' => $email,
                'phone' => trim((string) ($b['phone'] ?? '')),
                'password_hash' => password_hash($password, PASSWORD_BCRYPT),
                'avatar_url' => (string) ($b['avatarUrl'] ?? ''),
                'bio' => (string) ($b['bio'] ?? ''),
                'linked_client_name' => !empty($b['linkedClientName']) ? (string) $b['linkedClientName'] : null,
                'allowed_modules_json' => json_encode($b['allowedModules'] ?? [], JSON_UNESCAPED_UNICODE),
                'permissions_json' => json_encode($b['permissions'] ?? [], JSON_UNESCAPED_UNICODE),
                'active' => !isset($b['active']) || $b['active'] ? 1 : 0,
            ];

            try {
                insertFilteredRow($pdo, 'users', $userDbRow, false);
            } catch (PDOException $e) {
                if ((string) $e->getCode() === '23000') {
                    jsonResponse(409, ['error' => 'Já existe um usuário com este nome de login ou e-mail na tabela users.']);
                }
                jsonResponse(500, ['error' => 'Erro ao gravar credenciais na tabela users do MySQL.']);
            }

            $sel = $pdo->prepare("SELECT {$selectUserCols} FROM users WHERE id = :id LIMIT 1");
            $sel->execute([':id' => $itemId]);
            $saved = $sel->fetch();
            jsonResponse(200, ['ok' => true, 'created' => true, 'item' => $saved ? formatUserRow($saved) : null]);
        }

        // Protege conta Super Admin e impede alteração de senha/hierarquia/permissões por não-Super-Admin
        if (!$actorIsSuperAdmin && ((int) ($existingUser['hierarchy_level'] ?? 99)) === 1) {
            jsonResponse(403, ['error' => 'Apenas o Super Admin pode alterar contas de Super Admin.']);
        }

        if (array_key_exists('password', $b) && trim((string) $b['password']) !== '' && !$actorIsSuperAdmin) {
            jsonResponse(403, ['error' => 'Apenas o Super Admin pode definir ou alterar senhas de acesso.']);
        }

        $patch = [];
        if (array_key_exists('name', $b)) $patch['name'] = trim((string) $b['name']);
        if (array_key_exists('department', $b)) $patch['department'] = trim((string) $b['department']);
        if (array_key_exists('phone', $b)) $patch['phone'] = trim((string) $b['phone']);
        if (array_key_exists('avatarUrl', $b)) $patch['avatar_url'] = (string) $b['avatarUrl'];
        if (array_key_exists('bio', $b)) $patch['bio'] = (string) $b['bio'];
        if (array_key_exists('linkedClientName', $b)) {
            $patch['linked_client_name'] = !empty($b['linkedClientName']) ? (string) $b['linkedClientName'] : null;
        }

        // Campos de credenciais e hierarquia exclusivos do Super Admin
        if ($actorIsSuperAdmin) {
            if (array_key_exists('loginName', $b)) {
                $slug = slugifyLoginName((string) $b['loginName']);
                $patch['login_name'] = $slug !== '' ? $slug : null;
            }
            if (array_key_exists('role', $b)) $patch['role'] = trim((string) $b['role']);
            if (array_key_exists('hierarchyLevel', $b)) $patch['hierarchy_level'] = (int) $b['hierarchyLevel'];
            if (array_key_exists('email', $b)) {
                $email = strtolower(trim((string) $b['email']));
                if ($email === '' && !empty($patch['login_name'])) {
                    $email = $patch['login_name'] . '@fortmidia.local';
                }
                if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    jsonResponse(400, ['error' => 'E-mail informado é inválido.']);
                }
                if ($email !== '') {
                    $patch['email'] = $email;
                }
            }
            if (array_key_exists('allowedModules', $b)) {
                $patch['allowed_modules_json'] = json_encode($b['allowedModules'] ?? [], JSON_UNESCAPED_UNICODE);
            }
            if (array_key_exists('permissions', $b)) {
                $patch['permissions_json'] = json_encode($b['permissions'] ?? [], JSON_UNESCAPED_UNICODE);
            }
            if (array_key_exists('active', $b)) {
                $patch['active'] = $b['active'] ? 1 : 0;
            }
            if (array_key_exists('password', $b) && trim((string) $b['password']) !== '') {
                $newPassword = (string) $b['password'];
                if (strlen($newPassword) < 6) {
                    jsonResponse(400, ['error' => 'A nova senha deve ter pelo menos 6 caracteres.']);
                }
                $patch['password_hash'] = password_hash($newPassword, PASSWORD_BCRYPT);
            }
        }

        try {
            updateFilteredRow($pdo, 'users', $itemId, $patch);
        } catch (PDOException $e) {
            if ((string) $e->getCode() === '23000') {
                jsonResponse(409, ['error' => 'Este nome de login ou e-mail já está em uso por outro usuário.']);
            }
            jsonResponse(500, ['error' => 'Erro ao atualizar usuário no MySQL.']);
        }

        $sel = $pdo->prepare("SELECT {$selectUserCols} FROM users WHERE id = :id LIMIT 1");
        $sel->execute([':id' => $itemId]);
        $saved = $sel->fetch();
        jsonResponse(200, ['ok' => true, 'item' => $saved ? formatUserRow($saved) : null]);
    }

    if ($method === 'DELETE' && $itemId) {
        requireSuperAdmin($pdo);
        if ($itemId === $currentAdmin['id']) {
            jsonResponse(400, ['error' => 'Não é permitido excluir o próprio usuário atualmente conectado.']);
        }
        $stmt = $pdo->prepare('DELETE FROM users WHERE id = :id');
        $stmt->execute([':id' => $itemId]);
        jsonResponse(200, ['ok' => true]);
    }
}

// ----------------------------------------------------------------------------
// 17. Proxy Seguro de IA (/api/ai) — GEMINI_API_KEY lida APENAS no servidor
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
