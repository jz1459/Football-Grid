# Football Grid Backend (Express + TypeScript + PostgreSQL)

## Setup

1. Create a PostgreSQL database and set `DATABASE_URL` in `.env` (see `.env.example`).
2. Install dependencies: `npm install`
3. Generate Prisma client: `npm run db:generate`
4. Create tables: `npm run db:push` (or `npm run db:migrate` for a migration file)
5. **Populate Postgres:** keep `DATABASE_URL` only in **`backend-ts/.env`** (same DB as step 1).
   - **nflverse:** `npm run db:seed` → `data/seed-from-nflverse.ts` (CSV from [nflverse-data](https://github.com/nflverse/nflverse-data/releases/tag/rosters), same source as R `load_rosters()`). Edit `SEASON_RANGE` / `SEASON_YEARS` at the top of that file.
   - **Pro-Football-Reference** (HTML, Cloudflare-prone): Python pipeline in `backend/data.py` with `DATABASE_URL` in `backend/.env` if you need PFR → Postgres.

## Run

- Development: `npm run dev`
- Production: `npm run build && npm start`

Server listens on `PORT` (default 5001).

## Code map (reading order)

Trace the app top-down:

1. **`src/index.ts`** — Express app, CORS/JSON middleware, mounts legacy routes and `/players/*`.
2. **`src/routes/players.ts`** — `searchHandler` / `validateHandler`: Prisma queries, GSIS merge for autocomplete, homonym handling for validate. Each exported handler has a JSDoc block above it.
3. **`prisma/schema.prisma`** — `Player` (`@@unique([name, position])`, optional `gsisId`), `Team`, `PlayerTeam`.
4. **nflverse ingest** — **`data/positions.ts`** (`POSITION_ABBREV_TO_GRID`, `seasonRangeInclusive`) → **`data/nflverse.ts`** (CSV URLs, team abbrev → display name) → **`data/seed-from-nflverse.ts`** (season loop, `upsertPlayerFromNflverse` for GSIS + duplicate merge). Constants at the top of the seed file.

Function-level comments live in those files as `/** … */` JSDoc so you can follow behavior without leaving the editor.

## Docker (full stack with existing frontend)

From the **repository root**, the new stack (Postgres + this API + CRA frontend) is defined in `docker-compose.postgres.yml`. The legacy MySQL + Flask stack remains `docker-compose.yml`.

```bash
docker compose -f docker-compose.postgres.yml up --build
```

- API: [http://localhost:5001](http://localhost:5001) (same port the frontend already uses)
- App: [http://localhost:3000](http://localhost:3000) — **Next.js** image from `frontend-ts/` (compose `frontend` service). Override at build time if needed: `docker compose ... build --build-arg NEXT_PUBLIC_API_URL=http://your-host:5001 frontend`.
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

There is no rate limiting on these routes right now; add middleware (e.g. `express-rate-limit`) before production if you need it.
