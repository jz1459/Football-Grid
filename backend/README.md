# Football Grid Backend (Express + TypeScript + PostgreSQL)

## Setup

1. Create a PostgreSQL database and set `DATABASE_URL` in `.env` (see `.env.example`).
2. Install dependencies: `npm install`
3. Generate Prisma client: `npm run db:generate`
4. Create tables: `npm run db:push` (or `npm run db:migrate` for a migration file)
5. **Populate Postgres:** keep `DATABASE_URL` only in **`backend/.env`** (same DB as step 1).
   - **nflverse:** `npm run db:load_data` → `data/load_data.ts` (CSV from [nflverse-data](https://github.com/nflverse/nflverse-data/releases/tag/rosters), same source as R `load_rosters()`). Edit repo **`config/game.json`** for seasons and team seeding (optional `GAME_CONFIG_PATH` in `.env`).

## Run

- Development: `npm run dev`
- Production: `npm run build && npm start`

Server listens on `PORT` (default 5001).

**Board headers:** `POST /boards/random` `{ gridSize }` returns `{ triviaRow, triviaColumn }` such that every cell has ≥1 player linked to both teams. Valid team-pairs come only from committed **`data/valid-pairs.json`** (no cold `PlayerTeam` scan). Regenerate it with **`npm run db:load_data`** after changing roster data, or call **`POST /boards/refresh-pairs`** to rebuild from the DB without a full re-seed. The Docker image copies **`data/`** so the file is present at container start.

## Code map (reading order)

Trace the app top-down:

1. **`src/index.ts`** — Express app, CORS/JSON, legacy routes, `/boards/*`, `/players/*`.
2. **`src/routes/boards.ts`** — `POST /random` solvable headers; `POST /refresh-pairs` rebuilds JSON + cache.
3. **`src/lib/generateValidPairs.ts`** — Build valid pair set from DB; read/write `data/valid-pairs.json`.
4. **`src/lib/generateValidBoard.ts`** — Cached `getValidPairSet` (JSON only); `sampleValidBoard`.
5. **`src/routes/players.ts`** — `searchHandler` / `validateHandler` (uses **`src/db.ts`** Prisma singleton).
6. **`prisma/schema.prisma`** — `Player` (`@@unique([name, position])`, optional `gsisId`), `Team`, `PlayerTeam`.
7. **nflverse ingest** — **`data/positions.ts`** → **`data/nflverse.ts`** → **`data/load_data.ts`** (`npm run db:load_data`, also writes `data/valid-pairs.json`).

Function-level comments live in those files as `/** … */` JSDoc so you can follow behavior without leaving the editor.

## Docker (full stack)

From the **repository root**, Postgres + this API + the Next.js app are defined in **`docker-compose.yml`**.

```bash
docker compose up --build
```

**Convenience scripts** (run from the **repository root**):

| Script | What it runs |
|--------|----------------|
| `./start.sh` | `docker compose up -d --build` |
| `./stop.sh` | `docker compose down` |
| `./load_data.sh` | `npm install`, `db:generate`, `db:load_data` in `backend/` — uses **`backend/.env`** for `DATABASE_URL` (same as `npm run dev` / Prisma). |

- API: [http://localhost:5001](http://localhost:5001)
- App: [http://localhost:3000](http://localhost:3000) — **Next.js** image from `frontend/` (compose service `frontend`). Override at build time if needed: `docker compose build --build-arg NEXT_PUBLIC_API_URL=http://your-host:5001 frontend`.
- Postgres is also published on `5432` for one-off tools / loading data

After tables exist (the API container runs `prisma db push` on startup), load roster data from the host with the **same** `DATABASE_URL` (Postgres published on `5432`):

```bash
cd backend && cp .env.example .env
# Set DATABASE_URL=postgresql://app:apppass@localhost:5432/football_grid
npm install && npm run db:generate && npm run db:load_data
```

## API

- `GET /health` – returns `{ "status": "ok" }`
- `GET /test` – legacy "Hello World" (for compatibility)
- `POST /players/search` – body `{ "searchTerm": string, "limit"?: number }` (default limit 10). Returns `[{ "name", "position" }, ...]`
- `POST /players/validate` – body `{ "playerName": string, "position"?: string }`. Returns array of team names or 404. Send `position` when the user picked a suggestion like "Name (Position)" to resolve duplicates.

Legacy-style paths (same handlers as `/players/*`): `POST /search_players` (same as `/players/search`), `POST /get_player` (same as `/players/validate`).

There is no rate limiting on these routes right now; add middleware (e.g. `express-rate-limit`) before production if you need it.
