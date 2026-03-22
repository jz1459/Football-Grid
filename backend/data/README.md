# Data loading (nflverse → Postgres)

- **`positions.ts`** — NFL position abbreviations → Football Grid buckets (`POSITION_ABBREV_TO_GRID`) and `seasonRangeInclusive()` for seed loops.
- **`nflverse.ts`** — Fetches nflverse roster CSVs (same files as R `nflreadr::load_rosters`) + team metadata CSV for abbrev → display name.
- **`load_data.ts`** — Prisma seed (`npm run db:seed` or repo root `./load_data.sh`). Uses `gsis_id` when present so one `Player` row per NFL player (avoids DL/LB duplicates). After schema changes, run `npm run db:push` then re-seed if you want a clean table; the API still merges teams for the same GSIS across duplicate rows.

**Env:** only `DATABASE_URL` in **`../.env`** (project root `backend/.env`).

**Seasons:** edit `SEASON_YEARS` and/or `SEASON_RANGE` at the top of `load_data.ts`. A range unions everyone who appeared on a team in any of those years (no `season` column in the DB).

```bash
cd backend
npm run db:generate   # if needed
npm run db:push       # if tables not created yet
npm run db:seed       # nflverse CSV (historical season rosters)
```
