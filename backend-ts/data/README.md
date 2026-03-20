# Data loading (ESPN → Postgres)

- **`espn.ts`** — ESPN JSON endpoints, position mapping, team display-name list. Seeding uses `site.api` roster first; if that returns no players (typical for past seasons), it falls back to `sports.core.api.espn.com` (team athlete index + one request per player).
- **`seed-from-espn.ts`** — Prisma seed from ESPN (`npm run db:seed`).
- **`nflverse.ts`** — Fetches nflverse roster CSVs (same files as R `nflreadr::load_rosters`) + team metadata CSV for abbrev → display name.
- **`seed-from-nflverse.ts`** — Prisma seed from nflverse (`npm run db:seed:nflverse`). Season-level snapshot rosters, not weekly union.

**Env:** only `DATABASE_URL` in **`../.env`** (project root `backend-ts/.env`).

**Seasons:** edit `SEASON_YEARS` and/or `SEASON_RANGE` at the top of `seed-from-espn.ts`. Empty list + null range = current roster only. A range unions everyone who appeared on a team in any of those years (no `season` column in the DB).

```bash
cd backend-ts
npm run db:generate   # if needed
npm run db:push       # if tables not created yet
npm run db:seed              # ESPN
npm run db:seed:nflverse     # nflverse CSV (historical season rosters)
```

Pro-Football-Reference scraping lives in **`../../backend/data.py`** (Python).
