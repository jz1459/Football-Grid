# Football Grid

NFL “two teams” tic-tac-toe: **Next.js** (`frontend/`) + **Express + Prisma** (`backend/`) + **PostgreSQL** (`docker-compose.yml`).

## Docker quick start

1. **Repository root `.env`** — copy [`.env.example`](.env.example) to `.env`. Set `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` (Compose substitutes these into `docker-compose.yml`; nothing is hardcoded there).

2. **`backend/.env`** — copy from `backend/.env.example` and set `DATABASE_URL` to the same database on your machine, for example:

   `postgresql://POSTGRES_USER:POSTGRES_PASSWORD@localhost:5432/POSTGRES_DB`

   (Use the same values as in the root `.env`.)

3. Start stack:

   ```bash
   ./start.sh
   ```

4. Load nflverse roster data (reads **`backend/.env`**; run after Postgres is up):

   ```bash
   ./load_data.sh
   ```

5. Stop:

   ```bash
   ./stop.sh
   ```

- App: [http://localhost:3000](http://localhost:3000)  
- API: [http://localhost:5001](http://localhost:5001)

More detail: **`backend/README.md`**, **`frontend/README.md`**, **`docker-compose.yml`**.
