# Promptv

Promptv is a prompt-management workspace built with Next.js, FastAPI, PostgreSQL, Redis, and Storybook. It supports workspace and folder management plus persistent prompts, statuses, versions, and active-version selection.

## Stack

- Frontend: Next.js 15, React 19, TypeScript, pnpm
- Backend: FastAPI, SQLAlchemy, Python 3.13, uv
- Data: PostgreSQL 17
- Cache: Redis 7
- UI catalog: Storybook
- Local platform: Docker Compose

## Quick Start

1. Create your local environment file:

```bash
cp .env.example .env.local
```

2. Set a private 36-character `AUTH_KEY` in `.env.local`.

3. Start the complete development stack:

```bash
docker compose up --build
```

4. Open the services:

- App: `http://localhost:3000`
- FastAPI docs: `http://localhost:8000/docs`
- API status: `http://localhost:8000/api/v1/status`
- Storybook: `http://localhost:6006`

The first startup creates one PostgreSQL-backed `Default` workspace. It cannot be deleted.

## Environment

Copy `.env.example` to `.env.local`; never commit `.env.local`.

| Variable | Purpose |
| --- | --- |
| `AUTH_ENABLED` | Enables the application login gate when `true`. |
| `AUTH_KEY` | Private 36-character authentication key. |
| `POSTGRES_DB` | PostgreSQL database name. |
| `POSTGRES_USER` | PostgreSQL user. |
| `POSTGRES_PASSWORD` | PostgreSQL password for local development. |
| `API_URL` | Server-side URL used by Next.js to reach FastAPI. |
| `NEXT_PUBLIC_APP_URL` | Public URL for the Next.js application. |

## Development

### Frontend

```bash
pnpm install
pnpm dev
```

Useful commands:

```bash
pnpm storybook
pnpm build-storybook
pnpm exec tsc --noEmit
```

### Backend

The backend is in [`backend/`](./backend) and uses `uv`.

```bash
cd backend
uv sync
uv run pytest
uv run uvicorn app.main:app --reload --port 8000
```

When developing locally outside Docker, set `DATABASE_URL` and `REDIS_URL` to services reachable from your machine.

## API

All API routes are under `/api/v1`.

| Resource | Routes |
| --- | --- |
| Status | `GET /status` |
| Workspaces | `GET`, `POST /workspaces/`; `GET`, `PATCH`, `DELETE /workspaces/{id}` |
| Folders | `GET`, `POST /workspaces/{id}/folders`; `GET`, `PATCH`, `DELETE /folders/{id}` |
| Prompts | `GET`, `POST /folders/{id}/prompts`; `GET`, `PATCH`, `DELETE /prompts/{id}` |
| Versions | `GET`, `POST /prompts/{id}/versions`; `PATCH /prompts/{id}/active-version` |

Folder and prompt lists are cached in Redis and invalidated after every write. PostgreSQL remains the source of truth.

## Testing

Run the backend suite through Docker:

```bash
docker compose run --rm api uv run pytest
```

Run frontend type checking:

```bash
pnpm exec tsc --noEmit
```

## Docker Notes

`docker compose up --build` starts `web`, `api`, `db`, `redis`, and `storybook`.

PostgreSQL data is persisted in the `postgres_data` volume and Redis data in `redis_data`. To intentionally reset all local data:

```bash
docker compose down -v
```

This permanently deletes local database and cache volumes.
