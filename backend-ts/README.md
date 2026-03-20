# Football Grid Backend (Express + TypeScript + PostgreSQL)

## Setup

1. Create a PostgreSQL database and set `DATABASE_URL` in `.env` (see `.env.example`).
2. Install dependencies: `npm install`
3. Generate Prisma client: `npm run db:generate`
4. Create tables: `npm run db:push` (or `npm run db:migrate` for a migration file)
5. **Populate Postgres:** keep `DATABASE_URL` only in **`backend-ts/.env`** (same DB as step 1).
   - **ESPN:** `npm run db:seed` → `data/seed-from-espn.ts` (JSON; core API fallback for empty site rosters).
   - **nflverse (recommended for historical season snapshots):** `npm run db:seed:nflverse` → `data/seed-from-nflverse.ts` (CSV from [nflverse-data](https://github.com/nflverse/nflverse-data/releases/tag/rosters), same source as R `load_rosters()`). Edit constants at the top of each seed file.
   - **Pro-Football-Reference** (HTML, Cloudflare-prone): Python pipeline in `backend/data.py` with `DATABASE_URL` in `backend/.env` if you need PFR → Postgres.

## Run

- Development: `npm run dev`
- Production: `npm run build && npm start`

Server listens on `PORT` (default 5001).

## Docker (full stack with existing frontend)

From the **repository root**, the new stack (Postgres + this API + CRA frontend) is defined in `docker-compose.postgres.yml`. The legacy MySQL + Flask stack remains `docker-compose.yml`.

```bash
docker compose -f docker-compose.postgres.yml up --build
```

- API: [http://localhost:5001](http://localhost:5001) (same port the frontend already uses)
- App: [http://localhost:3000](http://localhost:3000)
- Postgres is also published on `5432` for one-off tools / loading data

After tables exist (the API container runs `prisma db push` on startup), load roster data from the host with the **same** `DATABASE_URL` (Postgres published on `5432`):

```bash
cd backend-ts && cp .env.example .env
# Set DATABASE_URL=postgresql://app:apppass@localhost:5432/football_grid
npm install && npm run db:generate && npm run db:seed
```

## API

- `GET /health` – returns `{ "status": "ok" }`
- `GET /test` – legacy "Hello World" (for compatibility)
- `POST /players/search` – body `{ "searchTerm": string, "limit"?: number }` (default limit 10). Returns `[{ "name", "position" }, ...]`
- `POST /players/validate` – body `{ "playerName": string, "position"?: string }`. Returns array of team names or 404. Send `position` when the user picked a suggestion like "Name (Position)" to resolve duplicates.

Legacy paths (so the current CRA frontend works without changes): `POST /search_players` (same as `/players/search`), `POST /get_player` (same as `/players/validate`).

## Rate limits

- Search: 100 requests per 15 minutes per IP
- Validate: 60 requests per 15 minutes per IP
