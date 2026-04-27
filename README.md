# Automação de Reuniões (Fase 1) — Teams + IA

Base completa para:
- Sincronizar reuniões/transcrições/resumos do Microsoft Teams (via Microsoft Graph)
- Processar com OpenAI (resumo + action items + tópicos) em saída estruturada
- Persistir em PostgreSQL
- Notificar via e-mail e webhook do Teams
- Consultar via painel web (React + Vite)

## Requisitos

- Node.js 20+
- PNPM
- Docker (para PostgreSQL local)

## Setup rápido

1) Suba o Postgres:

```bash
docker-compose up -d
```

2) Configure variáveis de ambiente:

- Copie `.env.example` para `.env` na raiz e também em `backend/.env` (o backend é quem consome).
- Copie `frontend/.env.example` para `frontend/.env` (credenciais do painel para Basic Auth).

3) Instale dependências:

```bash
pnpm install
```

4) Rode migrations:

```bash
pnpm migrate
```

5) Suba backend e frontend:

```bash
pnpm dev
```

## Segurança (Basic Auth)

- `GET /api/health` é público.
- `GET /api/meetings`, `GET /api/meetings/:id` e `POST /api/sync` exigem **Basic Auth**.
- Ajuste as credenciais em `BASIC_AUTH_USER` e `BASIC_AUTH_PASS`.

## Endpoints

- `GET /api/health`
- `GET /api/meetings`
- `GET /api/meetings/:id`
- `POST /api/sync`

### Query params e respostas

- **GET `/api/meetings`**
  - Query: `q`, `from`, `to`, `page`, `pageSize`
  - Response: `{ items, page, pageSize, total }`
- **GET `/api/meetings/:id`**
  - Query: `includeTranscript=1` para incluir a transcrição
- **POST `/api/sync`**
  - Response: `{ startedAt, processedCount, skippedCount }` (ou `{ startedAt, error }`)

## Azure AD / Microsoft Graph (App Registration)

1) Portal `portal.azure.com` → Microsoft Entra ID → App registrations → New registration
2) Nome sugerido: `VirexMeetingBot`
3) Em **API permissions** (Application):
   - `OnlineMeetings.Read.All`
   - `CallRecords.Read.All`
   - `User.Read.All`
4) Conceder **Admin Consent**
5) Em **Certificates & secrets** → criar `client secret`
6) Preencher `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_CLIENT_SECRET` no `.env`

### Observação importante (App-only)

Para listar reuniões de forma previsível em app-only, este projeto aceita `GRAPH_USER_ID`
(id do usuário no Entra ID). Isso evita depender de endpoints que exigem contexto delegado.

