# Football Grid

NFL “two teams” tic-tac-toe: **Next.js** (`frontend/`) + **Express + Prisma** (`backend/`) + **PostgreSQL** (`docker-compose.yml`).

## Docker quick start

1. **`backend/.env`** — copy from `backend/.env.example` and set `DATABASE_URL`. For the default compose Postgres on your machine:

   `postgresql://app:apppass@localhost:5432/football_grid`

2. Start stack:

   ```bash
   ./start.sh
   ```

3. Load nflverse roster data (reads **`backend/.env`**; run after Postgres is up):

   ```bash
   ./load_data.sh
   ```

4. Stop:

   ```bash
   ./stop.sh
   ```

- App: [http://localhost:3000](http://localhost:3000)  
- API: [http://localhost:5001](http://localhost:5001)

More detail: **`backend/README.md`**, **`frontend/README.md`**, **`docker-compose.yml`**.
