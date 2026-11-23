# Backend PHP + MySQL (cPanel HomeHost) — Exemplo Pronto para Produção

Esta pasta fica **fora do build frontend (`dist/`)** e fornece a estrutura completa para conectar o CRM FortMídia e o Portal FortNews ao banco **MySQL da HomeHost** sem Firebase.

## Passo 1 — Importar Banco de Dados no phpMyAdmin
1. No **cPanel > Bancos de dados MySQL**, crie o banco de dados, crie um usuário MySQL com senha forte e vincule o usuário ao banco com todos os privilégios.
2. Abra o **phpMyAdmin**, selecione o banco criado, clique em **Importar** e envie o arquivo `schema.sql`.

## Passo 2 — Publicar a API PHP em `/home/fo181274/fortmidia.com.br/api/`
1. Copie a pasta `api/` (`index.php`, `.htaccess` e `config.example.php`) para `/home/fo181274/fortmidia.com.br/api/` (e opcionalmente `/home/fo181274/fortnews.com.br/api/`) no Gerenciador de Arquivos do cPanel. *(Não utilize `/public_html/`).*
2. Renomeie `config.example.php` para `config.php` e preencha:
   - `db_host`, `db_name`, `db_user`, `db_pass`
   - `gemini_api_key` (chave lida **exclusivamente no servidor PHP**, nunca exposta no frontend)
   - `allowed_origins` (já pré-configurado para `fortmidia.com.br`, `fortnews.com.br` e `jornalfortnews.com.br`)
3. O arquivo `api/.htaccess` já bloqueia o acesso HTTP direto ao `config.php` e repassa o cabeçalho `Authorization: Bearer` em servidores PHP CGI/FPM do cPanel.

## Passo 3 — Criar o Primeiro Super Admin (com senha bcrypt)
Com a tabela `users` vazia, execute uma única requisição `POST` para cadastrar o primeiro acesso:

```bash
curl -X POST https://fortmidia.com.br/api/auth/setup-admin \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Emerson Carneiro dos Santos",
    "email": "diretoria@fortmidia.com.br",
    "password": "SUA_SENHA_FORTE_AQUI"
  }'
```

Após criado o primeiro usuário, a rota `setup-admin` é bloqueada automaticamente (HTTP 409).

## Endpoints Principais
- `GET /api/health` — status da API
- `GET /api/public-config` — configurações públicas (sem segredos)
- `POST /api/auth/login` · `GET /api/auth/me` · `POST /api/auth/logout` — autenticação Bearer Token
- `GET /api/state` · `PUT /api/state` — sincronização completa do CRM/CMS (autenticado)
- `GET/POST/DELETE /api/pautas` — notícias e pautas do Portal FortNews
- `GET/POST/PUT/DELETE /api/demandas` — relatos do Canal Fala Cidadão
- `GET/POST /api/clientes/leads` · `GET /api/clientes/contracts` — CRM Comercial
- `GET/POST /api/usuarios` — gestão de hierarquia (Super Admin / Admin)
- `POST /api/ai` — proxy seguro de IA (`action`: `scan-news`, `generate-ticker`, `generate-thumbnail`)
