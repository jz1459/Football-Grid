# This script is used to load the data into the database, it is used to populate the database with the data from the nflverse.
# The relevant parameters are set in the config/game.json file.

#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"

cd "$BACKEND"

if [[ ! -f .env ]]; then
  echo "Missing backend/.env — copy backend/.env.example to backend/.env and set DATABASE_URL." >&2
  echo "For Docker Postgres (compose default): postgresql://app:apppass@localhost:5432/football_grid" >&2
  exit 1
fi

npm install
npm run db:generate
npm run db:load_data
