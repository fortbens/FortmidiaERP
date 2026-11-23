# Guia de Publicação — Grupo FortMídia & Portal FortNews (cPanel HomeHost + MySQL + GitHub Actions)

Este aplicativo gera um **build único multi-domínio (`dist/`)** pronto para rodar em hospedagem tradicional **cPanel / HomeHost** com backend **PHP 8+ e MySQL** e deploy automatizado via **GitHub Actions** (sem Firebase).

## 1. Roteamento Inteligente Multi-Domínio (Mesmo Build)

O aplicativo detecta automaticamente `window.location.hostname` em tempo de execução:
- **`fortnews.com.br` / `www.fortnews.com.br`** (e `jornalfortnews.com.br`): abre diretamente o **Portal Público de Notícias FortNews**. O painel administrativo fica acessível mediante login em `/admin`, `/crm` ou `/sistema`.
- **`fortmidia.com.br` / `www.fortmidia.com.br`**: abre diretamente o site institucional da **Agência FortMídia** com rotas `/admin`, `/crm`, `/sistema`, `/cliente` e `/apresentacao`.
- **`localhost` / ambientes de preview**: exibe um seletor discreto de ambiente na base da tela para alternar livremente entre **FortMídia**, **FortNews** e **CRM / Admin**.

O arquivo `public/.htaccess` (copiado automaticamente para `dist/.htaccess`) redireciona todas as rotas internas da SPA para `index.html` **sem interferir na pasta `/api/`**.

## 2. Banco de Dados MySQL & Backend PHP (HomeHost)

Na pasta `/backend-php-example` (fora do build frontend) você encontra:
1. **`schema.sql`**: importe diretamente no **phpMyAdmin** do cPanel para criar as tabelas do CRM FortMídia e do Portal FortNews (`users`, `user_sessions`, `news_pautas`, `crm_leads`, `crm_contracts`, `crm_client_tasks`, `campaigns`, `outdoor_points`, `citizen_reports`, `app_state_snapshots`).
2. **`api/index.php` + `api/.htaccess` + `api/config.example.php`**: copie a pasta `api/` para `/home/fo181274/fortmidia.com.br/api/` (e/ou `/home/fo181274/fortnews.com.br/api/`), renomeie `config.example.php` para `config.php` e preencha as credenciais MySQL e a chave `GEMINI_API_KEY` exclusivamente no servidor. *(Nunca publique na `/public_html/`, pois ela pertence a outro site).*
3. **Primeiro Super Admin**: com a tabela `users` vazia, chame `POST /api/auth/setup-admin` (ou insira um usuário usando `password_hash()` em PHP) para cadastrar o acesso inicial com senha criptografada (bcrypt).

## 3. Publicação Automática via GitHub Actions (FTPS + branch `cpanel-deploy`)

O workflow `.github/workflows/deploy.yml` valida TypeScript (`npm run lint`), gera `dist/` (`npm run build`), atualiza automaticamente a branch `cpanel-deploy` (com `dist/` + `.cpanel.yml`) e, quando os Secrets de FTP estiverem configurados, sincroniza automaticamente via FTPS preservando a pasta `/api/` no servidor.

Configure em **GitHub > Settings > Secrets and variables > Actions**:
- **Domínio FortMídia (`fortmidia.com.br`)**:
  - `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`
  - Opcional: `FTP_DIR_FORTMIDIA` (padrão `/fortmidia.com.br/`)
- **Domínio FortNews (`fortnews.com.br`)**:
  - `FTP_SERVER_FORTNEWS`, `FTP_USERNAME_FORTNEWS`, `FTP_PASSWORD_FORTNEWS` (ou reutiliza os mesmos secrets do cPanel principal)
  - Opcional: `FTP_DIR_FORTNEWS` (padrão `/fortnews.com.br/`)
- **Variável opcional (`Variables`)**:
  - `VITE_API_BASE_URL` (padrão `/api` ou `https://fortmidia.com.br/api`)

## 4. Sincronização pelo "Controle de Versão do Git™" no cPanel (Alternativa ao FTPS)

Se preferir puxar pelo **Controle de Versão do Git™** no cPanel (em vez de usar FTPS via GitHub Actions):

1. **Se o repositório no GitHub for Privado (causa mais comum da clonagem sumir no cPanel)**:
   - O cPanel não consegue clonar repositórios privados usando URL `https://github.com/...` sem credenciais.
   - No cPanel, abra **Acesso SSH → Gerenciar Chaves SSH → Gerar uma nova chave** (deixe a senha/passphrase em branco) e clique em **Autorizar**.
   - Clique em **Exibir/Baixar** na chave pública (`.pub`) e copie todo o conteúdo (`ssh-rsa ...`).
   - No GitHub (`https://github.com/fortbens/ErpFortMidia/settings/keys`), clique em **Add deploy key**, cole a chave pública e salve.
   - No cPanel (**Controle de Versão do Git™ → Criar**), use a URL SSH:
     `git@github.com:fortbens/ErpFortMidia.git`
2. **Caminho do Repositório (precisa ser uma pasta nova vazia)**:
   - Nunca aponte para `public_html` nem direto para pastas que já contêm arquivos.
   - Use um caminho vazio, por exemplo: `/home/fo181274/repositories/ErpFortMidia`.
3. **Branch recomendada: `cpanel-deploy`**:
   - A cada push na `main`, o GitHub Actions compila automaticamente o projeto e publica a pasta `dist/` pronta + `.cpanel.yml` na branch leve **`cpanel-deploy`**.
   - No cPanel, em **Gerenciar → Informações Básicas**, troque a branch para **`cpanel-deploy`**, vá em **Pull ou Implantação → Atualizar do Remoto** e clique em **Implantar HEAD Commit** (Deploy HEAD Commit). O `.cpanel.yml` copiará automaticamente os arquivos compilados para `/home/fo181274/fortmidia.com.br/` e `/home/fo181274/fortnews.com.br/` sem tocar em `/public_html/` e sem apagar `/api/`.

## 5. Build Local / Upload Manual no cPanel

```bash
npm install
npm run build
```

Envie todo o conteúdo da pasta `dist/` (incluindo o arquivo oculto `.htaccess`) para `/home/fo181274/fortmidia.com.br/` e `/home/fo181274/fortnews.com.br/` no Gerenciador de Arquivos do cPanel.

## 6. Governança & Contato
- Diretoria Executiva: **Emerson Carneiro dos Santos** (Editor-Chefe & Diretor Executivo)
- CNPJ: `66.550.817/0001-41`
- Telefone / WhatsApp: `(11) 95779-2424`
- E-mail oficial: `comercial@fortmidia.com.br`
