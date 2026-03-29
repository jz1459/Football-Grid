# Backend

## Setup

1. Create a PostgreSQL database and set `DATABASE_URL` in `.env` (see `.env.example`).
2. Install dependencies: `npm install`
3. Generate Prisma client: `npm run db:generate`
4. Create tables: `npm run db:push` (or `npm run db:migrate` for a migration file)
5. **Populate Postgres:** keep `DATABASE_URL` only in `**backend/.env`** (same DB as step 1).
  - **nflverse:** `npm run db:load_data`calls`data/load_data.ts.` 
    - Edit repo `config/game.json` for seasons and team seeding (optional `GAME_CONFIG_PATH` in `.env`).

## Run

- Development: `npm run dev`
- Production: `npm run build && npm start`

Server listens on `PORT` (default 5001).

## API

- `GET /health` – returns `{ "status": "ok" }`
- `GET /test` – legacy "Hello World" (for compatibility)
- `POST /players/search` – body `{ "searchTerm": string, "limit"?: number }` (default limit 10). Returns `[{ "name", "position" }, ...]`
- `POST /players/validate` – body `{ "playerName": string, "position"?: string }`. Returns array of team names or 404. Send `position` when the user picked a suggestion like "Name (Position)" to resolve duplicates.

