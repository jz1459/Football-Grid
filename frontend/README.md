# Football Grid — Next.js (TypeScript + Tailwind)

Football Grid UI: same game flow and API calls as the original prototype, built with the App Router and Tailwind CSS.

## Setup

```bash
npm install
```

Start the API from `backend` (`npm run dev`, default port **5001**), then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API

The browser calls `NEXT_PUBLIC_API_URL` (default `http://localhost:5001`) for:

- `POST /search_players` — autocomplete
- `POST /get_player` — validate pick against row/column teams

For Docker or another host, set `NEXT_PUBLIC_API_URL` to the reachable base URL (no trailing slash).

## Scripts


| Command         | Description                |
| --------------- | -------------------------- |
| `npm run dev`   | Next dev server            |
| `npm run build` | Production build           |
| `npm run start` | Run production             |
| `npm run lint`  | `tsc --noEmit` (typecheck) |


`PlayerSearch` uses `react-autosuggest` (client-only). Game shell is in `src/components/Game.tsx`; shared helpers live under `src/lib/`.



