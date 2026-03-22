# Football Grid — Next.js (TypeScript + Tailwind)

Football Grid UI: same game flow and API calls as the original prototype, built with the App Router and Tailwind CSS.

## Setup

```bash
npm install
cp .env.example .env.local   # optional — set NEXT_PUBLIC_API_URL if the API is not on localhost:5001
```

Start the API from `backend` (`npm run dev`, default port **5001**), then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Code map (reading order)

1. **`src/app/layout.tsx`** / **`src/app/page.tsx`** / **`src/app/globals.css`** — App Router shell, metadata, global styles (incl. autosuggest dropdown CSS).
2. **`src/components/NormalGame.tsx`** — Game state, selectable **3×3 / 4×4 / 5×5** grid, API calls, trivia randomization (`2n` teams for `n×n`), win/draw detection via `calculateWinner(board, n)`.
3. **`src/components/NormalBoard.tsx`** / **`Square.tsx`** / **`TriviaCategories.tsx`** — Presentational grid pieces.
4. **`src/components/PlayerSearch.tsx`** — Modal + `react-autosuggest` wired to parent callbacks.
5. **`src/lib/api.ts`**, **`normalWinner.ts`** (generic `n×n` lines), **`teams.ts`** — Small pure helpers / constants.
6. **`src/types/player.ts`** — Shared suggestion shape.

Each exported function and major component has a `/** … */` JSDoc block in source.

## API

The browser calls `NEXT_PUBLIC_API_URL` (default `http://localhost:5001`) for:

- `POST /search_players` — autocomplete
- `POST /get_player` — validate pick against row/column teams

For Docker or another host, set `NEXT_PUBLIC_API_URL` to the reachable base URL (no trailing slash).

## Scripts

| Command        | Description        |
| -------------- | ------------------ |
| `npm run dev`  | Next dev server    |
| `npm run build` | Production build  |
| `npm run start` | Run production   |
| `npm run lint` | `tsc --noEmit` (typecheck) |

## Layout note

`PlayerSearch` uses `react-autosuggest` (client-only). Game shell is in `src/components/NormalGame.tsx`; shared helpers live under `src/lib/`.

## Docker

From the repo root, `docker compose up --build` builds this app with `NEXT_PUBLIC_API_URL=http://localhost:5001` (correct when the browser and API are both on your machine). To change it, pass a build arg on the `frontend` service (see root `docker-compose.yml`).
