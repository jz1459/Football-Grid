import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { NFL_TEAMS } from "../lib/nflTeams";
import { createBoard, getValidPairSet, refreshValidPairsFromDatabase } from "../lib/generateBoard";

const router = Router();

function isGridSize(n: unknown): n is 3 | 4 | 5 {
  return n === 3 || n === 4 || n === 5;
}

/**
 * POST body `{ gridSize?: 3|4|5 }`. Returns `{ triviaRow, triviaColumn }` where every cell has at least
 * one rostered player linked to both header teams (same semantics as the game UI). .
 */
router.post("/random", async (req: Request, res: Response): Promise<void> => {
  const raw = req.body?.gridSize ?? 3;
  if (!isGridSize(raw)) {
    res.status(400).json({ error: "gridSize must be 3, 4, or 5" });
    return;
  }
  const n = raw;

  // Get all the team names from the database
  const dbTeams = await prisma.team.findMany({ select: { name: true } });
  const inDb = new Set(dbTeams.map((t) => t.name));
  const pool = NFL_TEAMS.filter((name) => inDb.has(name));

  if (pool.length < 2 * n) {
    res.status(503).json({
      error: "Not enough teams in the database for this grid size. Run load_data and ensure teams match NFL_TEAMS.",
    });
    return;
  }

  try {
    // Get the valid team-pair set from the database to use in the board generation
    const validPairs = await getValidPairSet();

    // Create the board
    const board = createBoard(validPairs, pool, n);
    if (!board) {
      res.status(503).json({
        error: "Could not generate a fully solvable board after many tries. Try again or reload roster data.",
      });
      return;
    }
    res.json(board);
  } catch (e) {
    console.error("boards/random", e);
    const msg = e instanceof Error ? e.message : "Failed to build board";
    const missingPairsFile = msg.includes("valid-pairs.json");
    res.status(missingPairsFile ? 503 : 500).json({ error: msg });
  }
});

/** Rebuild `data/valid-pairs.json` and in-memory cache from the DB (e.g. after manual DB edits). */
router.post("/refresh-pairs", async (_req: Request, res: Response): Promise<void> => {
  try {
    const set = await refreshValidPairsFromDatabase();
    res.json({ ok: true, pairCount: set.size });
  } catch (e) {
    console.error("boards/refresh-pairs", e);
    res.status(500).json({ error: "Failed to refresh pair cache" });
  }
});

export const boardsRouter = router;
