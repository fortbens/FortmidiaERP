-- ============================================================================
-- CRM FortMídia & Portal FortNews — Schema MySQL (HomeHost / cPanel phpMyAdmin)
-- Compatível com MySQL 8.0+ e MariaDB 10.4+
-- ============================================================================

SET NAMES utf8mb4;
SET time_zone = '-03:00';

-- ----------------------------------------------------------------------------
-- 1. Usuários & Hierarquia de Acesso
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  role VARCHAR(80) NOT NULL DEFAULT 'Executivo Comercial',
  hierarchy_level TINYINT UNSIGNED NOT NULL DEFAULT 4,
  department VARCHAR(120) NOT NULL DEFAULT 'Operações FortMídia',
  email VARCHAR(180) NOT NULL UNIQUE,
  phone VARCHAR(40) DEFAULT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url TEXT DEFAULT NULL,
  bio TEXT DEFAULT NULL,
  linked_client_name VARCHAR(160) DEFAULT NULL,
  allowed_modules_json JSON DEFAULT NULL,
  permissions_json JSON DEFAULT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. Sessões Autenticadas (Bearer Token com hash SHA-256)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  ip_address VARCHAR(64) DEFAULT NULL,
  user_agent VARCHAR(255) DEFAULT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_expires (expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. Notícias & Pautas Editoriais (Portal Jornal FortNews)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS news_pautas (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  city VARCHAR(80) NOT NULL DEFAULT 'Regional CIMBAJU',
  seal VARCHAR(60) NOT NULL DEFAULT 'Geral',
  format VARCHAR(60) NOT NULL DEFAULT 'Portal 24/7',
  reporter VARCHAR(120) NOT NULL DEFAULT 'Redação FortNews',
  deadline VARCHAR(40) DEFAULT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Apuração de Rua',
  approval_status VARCHAR(60) NOT NULL DEFAULT 'Aguardando Redator-Chefe',
  summary TEXT NOT NULL,
  body LONGTEXT NOT NULL,
  image_url TEXT DEFAULT NULL,
  media_type VARCHAR(20) NOT NULL DEFAULT 'image',
  video_url TEXT DEFAULT NULL,
  source_protocol VARCHAR(40) DEFAULT NULL,
  approved_by VARCHAR(120) DEFAULT NULL,
  published_at VARCHAR(60) DEFAULT NULL,
  ai_generated TINYINT(1) NOT NULL DEFAULT 0,
  source_urls_json JSON DEFAULT NULL,
  social_creative_json JSON DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pautas_approval (approval_status),
  INDEX idx_pautas_city (city),
  INDEX idx_pautas_seal (seal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. CRM — Leads Comerciais
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_leads (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  company_or_name VARCHAR(180) NOT NULL,
  contact VARCHAR(140) NOT NULL,
  city VARCHAR(80) NOT NULL DEFAULT 'Franco da Rocha',
  quota_title VARCHAR(180) NOT NULL,
  notes TEXT DEFAULT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Novo Lead',
  created_at_label VARCHAR(40) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_leads_status (status),
  INDEX idx_leads_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. CRM — Contratos Comerciais & Patrocínios
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_contracts (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  client VARCHAR(180) NOT NULL,
  city VARCHAR(80) NOT NULL,
  product VARCHAR(180) NOT NULL,
  origin VARCHAR(40) NOT NULL DEFAULT 'Captação da Casa',
  owner_name VARCHAR(120) NOT NULL,
  monthly_value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  start_date VARCHAR(20) DEFAULT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Proposta',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_contracts_status (status),
  INDEX idx_contracts_client (client)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. CRM — Pipeline & Tarefas de Entrega de Clientes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_client_tasks (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  client_name VARCHAR(180) NOT NULL,
  campaign_title VARCHAR(200) NOT NULL,
  service_type VARCHAR(80) NOT NULL,
  city VARCHAR(80) NOT NULL,
  stage VARCHAR(60) NOT NULL DEFAULT 'Briefing & Onboarding',
  due_date VARCHAR(20) DEFAULT NULL,
  assignee VARCHAR(120) DEFAULT NULL,
  deliverable_url TEXT DEFAULT NULL,
  client_notes TEXT DEFAULT NULL,
  checklist_json JSON DEFAULT NULL,
  updated_at_label VARCHAR(40) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tasks_client (client_name),
  INDEX idx_tasks_stage (stage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. Campanhas de Publicidade & Veiculações
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaigns (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  advertiser VARCHAR(180) NOT NULL,
  title VARCHAR(200) NOT NULL,
  ad_type VARCHAR(80) NOT NULL,
  city VARCHAR(80) NOT NULL,
  placement_spec VARCHAR(200) DEFAULT NULL,
  start_date VARCHAR(20) DEFAULT NULL,
  end_date VARCHAR(20) DEFAULT NULL,
  contract_value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(40) NOT NULL DEFAULT 'Aguardando Arte',
  artwork_status VARCHAR(40) NOT NULL DEFAULT 'Pendente',
  creative_url TEXT DEFAULT NULL,
  checking_notes TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_campaigns_status (status),
  INDEX idx_campaigns_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. Inventário OOH — Outdoors 9x3m
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS outdoor_points (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  city VARCHAR(80) NOT NULL,
  location_name VARCHAR(200) NOT NULL,
  address_reference VARCHAR(255) DEFAULT NULL,
  dimensions VARCHAR(60) NOT NULL DEFAULT '9,00m x 3,00m',
  lighting VARCHAR(60) NOT NULL DEFAULT 'Frontlight LED',
  lat DECIMAL(10,7) NOT NULL DEFAULT -23.3219000,
  lng DECIMAL(10,7) NOT NULL DEFAULT -46.7272000,
  monthly_rate DECIMAL(12,2) NOT NULL DEFAULT 2300.00,
  biweekly_rate DECIMAL(12,2) NOT NULL DEFAULT 1350.00,
  availability VARCHAR(40) NOT NULL DEFAULT 'Disponível',
  current_advertiser VARCHAR(180) DEFAULT NULL,
  occupied_until VARCHAR(30) DEFAULT NULL,
  photo_url TEXT DEFAULT NULL,
  daily_traffic_estimate VARCHAR(80) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_outdoors_city (city),
  INDEX idx_outdoors_availability (availability)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. Demandas Cidadãs — Canal Fala Cidadão
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS citizen_reports (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  protocol VARCHAR(40) NOT NULL UNIQUE,
  citizen_name VARCHAR(150) NOT NULL,
  contact VARCHAR(120) NOT NULL,
  city VARCHAR(80) NOT NULL,
  neighborhood VARCHAR(120) NOT NULL,
  category VARCHAR(80) NOT NULL,
  urgency VARCHAR(20) NOT NULL DEFAULT 'Normal',
  title VARCHAR(220) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Aguardando Triagem',
  triage_score INT DEFAULT NULL,
  assigned_editor VARCHAR(120) DEFAULT NULL,
  created_at_label VARCHAR(40) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_reports_status (status),
  INDEX idx_reports_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 10. Snapshots de Configurações CMS / Presets do App (JSON)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_state_snapshots (
  snapshot_key VARCHAR(64) NOT NULL PRIMARY KEY,
  payload_json LONGTEXT NOT NULL,
  updated_by VARCHAR(64) DEFAULT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Nota de segurança:
-- Não insira senhas em texto puro no SQL. Após importar este schema no phpMyAdmin,
-- chame POST /api/auth/setup-admin uma única vez (com a tabela `users` vazia) para
-- criar o primeiro Super Admin com senha criptografada via password_hash (bcrypt).
