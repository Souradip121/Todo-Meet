# showup.day

Daily commitment and accountability app for builders who want to stay consistent.

---

## Running Locally

### Backend (Go API)

```bash
cp showup-api/.env.example showup-api/.env
# edit showup-api/.env with real values
cd showup-api && export $(grep -v '^#' .env | xargs) && go run ./cmd/server
```

### Frontend (Next.js)

```bash
cp .env.example .env.local
# edit .env.local — set NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
npm run dev
```

Frontend runs on [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

### Frontend (`.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | REST API base URL |
| `NEXT_PUBLIC_WS_URL` | WebSocket base URL |
| `BETTER_AUTH_SECRET` | Shared auth secret (must match API) |

### Backend (`showup-api/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string (pooled) |
| `DATABASE_URL_DIRECT` | Postgres connection string (direct, for migrations) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `BETTER_AUTH_SECRET` | Shared auth secret (must match frontend) |
| `BETTER_AUTH_URL` | Public URL of this API |
| `RESEND_API_KEY` | Resend email API key |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `APP_ENV` | `development` or `production` |
| `PORT` | HTTP port (default `8080`) |
| `WS_PORT` | WebSocket port (default `8081`) |
