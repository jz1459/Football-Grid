# Data loading (nflverse → Postgres)

- `**positions.ts**` — NFL position abbreviations → Football Grid buckets (`POSITIONS`) and `seasonRangeInclusive()` for seed loops.
- `**nflverse.ts**` — Fetches nflverse roster CSVs (same files as R `nflreadr::load_rosters`) + team metadata CSV for abbrev → display name.
- `**load_data.ts**` — Prisma seed (`npm run db:load_data` or repo root `./load_data.sh`). One `Player` row per nflverse `gsis_id` (`upsert` on `gsisId`); roster rows with empty `gsis_id` are skipped (count logged per season). After schema changes, run `npm run db:push` then re-seed for a clean table. On success it overwrites `**valid-pairs.json**` (committed in git — **commit updates** after changing seasons or roster logic so clones stay in sync).

Note: Players will be displayed using their latest listed position.

**Env:** only `DATABASE_URL` in `**../.env`** (project root `backend/.env`).

**Seasons:** repo `**config/game.json`** (`rosterSeason` / `rosterSeasonYears`). A range unions everyone who appeared on a team in any of those years (no `season` column in the DB).

```bash
cd backend
npm run db:generate   # if needed
npm run db:push       # if tables not created yet
npm run db:load_data  # nflverse CSV (historical season rosters) + valid-pairs.json
```

