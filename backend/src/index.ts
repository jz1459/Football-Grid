/**
 * Football Grid API: JSON body, CORS enabled. Legacy paths `/search_players` and `/get_player`
 * mirror the same handlers mounted under `/players/search` and `/players/validate`.
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import { playersRouter, searchHandler, validateHandler, resolvePairHandler } from "./routes/players";
import { boardsRouter } from "./routes/boards";
import { getGameConfig } from "./lib/gameConfig";
import { getRosterSeasonRange } from "./lib/rosterSeasonConfig";

const app = express();
const port = process.env.PORT ?? 5001;

app.use(cors());
app.use(express.json());

/** Liveness check for load balancers / Docker healthchecks. */
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

/** Public config for UI (from `config/game.json`). */
app.get("/config", (_req, res) => {
  try {
    const gc = getGameConfig();
    const rosterSeasonRange = getRosterSeasonRange();
    const rosterSeasonYears =
      gc.rosterSeasonYears && gc.rosterSeasonYears.length > 0
        ? [...new Set(gc.rosterSeasonYears)].sort((a, b) => a - b)
        : null;
    res.json({
      rosterSeasonRange,
      rosterSeasonYears,
      seed: {
        seedAllNflTeams: gc.seed.seedAllNflTeams,
        testTeamAbbrevs: gc.seed.testTeamAbbrevs,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid game configuration";
    res.status(500).json({ error: message });
  }
});

/** Minimal smoke route for verifying the server responds. */
app.get("/test", (_req, res) => {
  res.send("Hello World");
});

/** Autocomplete: substring match on player names → merged suggestions (by GSIS when present). */
app.post("/search_players", searchHandler);

/** Resolve a chosen player to sorted list of team display names they are linked to. */
app.post("/get_player", validateHandler);

/** One roster row `{ name, position }` that played for both teams (bot / hints). */
app.post("/resolve_pair", resolvePairHandler);

/** Random row/column headers such that every square has ≥1 player with both teams in the DB. */
app.use("/boards", boardsRouter);

app.use("/players", playersRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
