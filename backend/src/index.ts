/**
 * Football Grid API: JSON body, CORS enabled. Legacy paths `/search_players` and `/get_player`
 * mirror the same handlers mounted under `/players/search` and `/players/validate`.
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import { playersRouter, searchHandler, validateHandler } from "./routes/players";
import { boardsRouter } from "./routes/boards";

const app = express();
const port = process.env.PORT ?? 5001;

app.use(cors());
app.use(express.json());

/** Liveness check for load balancers / Docker healthchecks. */
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

/** Minimal smoke route for verifying the server responds. */
app.get("/test", (_req, res) => {
  res.send("Hello World");
});

/** Autocomplete: substring match on player names → merged suggestions (by GSIS when present). */
app.post("/search_players", searchHandler);

/** Resolve a chosen player to sorted list of team display names they are linked to. */
app.post("/get_player", validateHandler);

/** Random row/column headers such that every square has ≥1 player with both teams in the DB. */
app.use("/boards", boardsRouter);

app.use("/players", playersRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
