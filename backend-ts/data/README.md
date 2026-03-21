# Data loading (nflverse → Postgres)

- **`positions.ts`** — NFL position abbreviations → Football Grid buckets (`POSITION_ABBREV_TO_GRID`) and `seasonRangeInclusive()` for seed loops.
- **`nflverse.ts`** — Fetches nflverse roster CSVs (same files as R `nflreadr::load_rosters`) + team metadata CSV for abbrev → display name.
- **`seed-from-nflverse.ts`** — Prisma seed (`npm run db:seed`). Uses `gsis_id` when present so one `Player` row per NFL player (avoids DL/LB duplicates). After schema changes, run `npm run db:push` then re-seed if you want a clean table; the API still merges teams for the same GSIS across duplicate rows.

**Env:** only `DATABASE_URL` in **`../.env`** (project root `backend-ts/.env`).

**Seasons:** edit `SEASON_YEARS` and/or `SEASON_RANGE` at the top of `seed-from-nflverse.ts`. A range unions everyone who appeared on a team in any of those years (no `season` column in the DB).

```bash
cd backend-ts
npm run db:generate   # if needed
npm run db:push       # if tables not created yet
npm run db:seed       # nflverse CSV (historical season rosters)
```

Pro-Football-Reference scraping lives in **`../../backend/data.py`** (Python).
