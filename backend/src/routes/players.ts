import { Router, Request, Response } from "express";
import { prisma } from "../db";

const router = Router();

/** Interface for the body of the POST request to search for players. */
interface SearchBody {
  searchTerm?: string;
  limit?: number;
}

/** Interface for the body of the POST request to validate a player name. */
interface ValidateBody {
  playerName?: string;
  position?: string;
}

/**
 * POST body: `{ searchTerm?, limit? }`. Queries players whose name contains `searchTerm` (case-insensitive),
 * then returns up to `limit` (1–50) `{ name, position }` objects sorted by name (one row per `Player` record;
 */
export async function searchHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as SearchBody;
  const searchTerm = body.searchTerm ?? "";
  const limit = Math.min(Math.max(body.limit ?? 10, 1), 50);

  // Get all the players from the database that match the search term (letter case is ignored (insensitive) and plyaer.name must contain the search term as a substring)
  const players = await prisma.player.findMany({
    where: {
      name: { contains: searchTerm, mode: "insensitive" },
    },
    orderBy: [{ name: "asc" }, { position: "asc" }],

    // Limit the number of players returned to the limit * 25, but not more than 250
    take: Math.min(limit * 25, 250),
    select: { name: true, position: true },
  });

  // Return the players in the response
  res.json(
    players.map((p) => ({ name: p.name, position: p.position })).slice(0, limit),
  );
}

/**
 * POST body: `{ playerName, position? }`. Loads matching `Player` rows (optionally filtered by position
 * or slash-separated positions from the UI). Returns 400 if the name matches multiple distinct players
 * without a position filter; 404 if none; else 200 with a sorted JSON array of unique team names.
 * Returns the team names that the player has played for.
 */
export async function validateHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as ValidateBody;
  const playerName = body.playerName?.trim();
  const positionSpec = body.position?.trim();

  if (!playerName) {
    res.status(400).json({ error: "playerName is required" });
    return;
  }

  // Get the positions from the body
  const positions = positionSpec
    ? positionSpec.split(/\s*\/\s*/).map((s) => s.trim()).filter(Boolean)
    : [];

  // Get the players from the database that match the player name
  const whereName = { name: { equals: playerName, mode: "insensitive" as const } };

  // Get the players from the database that match the player name and position
  let nameMatches = await prisma.player.findMany({
    where:
      positions.length > 0
        ? { ...whereName, position: { in: positions } }
        : whereName,
    include: {
      playerTeams: {
        include: { team: { select: { name: true } } },
      },
    },
  });

  if (nameMatches.length === 0) {
    res.status(404).json({ error: "Player not found" });
    return;
  }

  /**
   * Homonyms: same display name, different people. If multiple `Player` rows match, require enough
   * context to pick one — different positions, or a single row after filtering.
   */
  const distinctPlayers = new Set(nameMatches.map((p) => p.id));
  if (distinctPlayers.size > 1) {
    if (positions.length > 0) {
      res.status(400).json({
        error:
          "Multiple players match this name and position; pick a different suggestion or search again.",
      });
      return;
    }
    const distinctPos = new Set(nameMatches.map((p) => p.position));
    if (distinctPos.size > 1) {
      res.status(400).json({
        error: "Multiple players share this name; choose a suggestion that includes position (e.g. Josh Allen (QB)).",
      });
      return;
    }
    res.status(400).json({
      error:
        "Multiple NFL players share this name and position; pick a suggestion that lists them distinctly, or refine your search.",
    });
    return;
  }

  const teamSet = new Set<string>();
  for (const p of nameMatches) {
    for (const pt of p.playerTeams) teamSet.add(pt.team.name);
  }

  res.json([...teamSet].sort());
}

/** Same behavior as `POST /search_players`. */
router.post("/search", searchHandler);

/** Same behavior as `POST /get_player`. */
router.post("/validate", validateHandler);

export const playersRouter = router;
