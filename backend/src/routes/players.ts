import { Router, Request, Response } from "express";
import { prisma } from "../db";

const router = Router();

interface SearchBody {
  searchTerm?: string;
  limit?: number;
}

interface ValidateBody {
  playerName?: string;
  position?: string;
}

/**
 * POST body: `{ searchTerm?, limit? }`. Queries players whose name contains `searchTerm` (case-insensitive),
 * merges rows sharing the same `gsisId` into one suggestion with combined positions, then returns up to
 * `limit` (1–50) `{ name, position }` objects sorted by name.
 */
export async function searchHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as SearchBody;
  const searchTerm = body.searchTerm ?? "";
  const limit = Math.min(Math.max(body.limit ?? 10, 1), 50);

  const players = await prisma.player.findMany({
    where: {
      name: { contains: searchTerm, mode: "insensitive" },
    },
    orderBy: [{ name: "asc" }, { position: "asc" }],
    take: Math.min(limit * 25, 250),
    select: { name: true, position: true, gsisId: true },
  });

  /**
   * Same `gsisId` = one NFL person (merge DL/LB into one suggestion). Different `gsisId` or missing
   * id = separate suggestions so homonyms (Josh Allen QB vs DL, Lamar Jackson QB vs DB) stay distinct.
   */
  const byGsis = new Map<string, { name: string; positions: Set<string> }>();
  const noGsis: { name: string; position: string }[] = [];

  for (const p of players) {
    if (p.gsisId) {
      let g = byGsis.get(p.gsisId);
      if (!g) {
        g = { name: p.name, positions: new Set() };
        byGsis.set(p.gsisId, g);
      }
      g.positions.add(p.position);
    } else {
      noGsis.push({ name: p.name, position: p.position });
    }
  }

  const fromGsis = [...byGsis.values()].map((g) => ({
    name: g.name,
    position: [...g.positions].sort().join(" / "),
  }));

  const combined = [...noGsis, ...fromGsis].sort((a, b) => {
    const n = a.name.localeCompare(b.name);
    return n !== 0 ? n : a.position.localeCompare(b.position);
  });

  res.json(combined.slice(0, limit));
}

/**
 * POST body: `{ playerName, position? }`. Loads matching `Player` rows (optionally filtered by position
 * or slash-separated positions from the UI). Returns 400 if the name matches multiple distinct players
 * without a position filter; 404 if none; else 200 with a sorted JSON array of unique team names.
 */
export async function validateHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as ValidateBody;
  const playerName = body.playerName?.trim();
  const positionSpec = body.position?.trim();

  if (!playerName) {
    res.status(400).json({ error: "playerName is required" });
    return;
  }

  const positions = positionSpec
    ? positionSpec.split(/\s*\/\s*/).map((s) => s.trim()).filter(Boolean)
    : [];

  const whereName = { name: { equals: playerName, mode: "insensitive" as const } };

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

interface ResolvePairBody {
  teamA?: string;
  teamB?: string;
}

/**
 * POST body: `{ teamA, teamB }` (display names, order irrelevant). Returns one `{ name, position }` row
 * whose roster includes both teams — stable choice (lowest `id`) for bot moves.
 */
export async function resolvePairHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as ResolvePairBody;
  const teamA = body.teamA?.trim();
  const teamB = body.teamB?.trim();

  if (!teamA || !teamB) {
    res.status(400).json({ error: "teamA and teamB are required" });
    return;
  }

  const players = await prisma.player.findMany({
    where: {
      AND: [
        { playerTeams: { some: { team: { name: teamA } } } },
        { playerTeams: { some: { team: { name: teamB } } } },
      ],
    },
    select: { id: true, name: true, position: true },
    orderBy: { id: "asc" },
    take: 1,
  });

  if (players.length === 0) {
    res.status(404).json({ error: "No player found for this team pair" });
    return;
  }

  const p = players[0]!;
  res.json({ name: p.name, position: p.position });
}

/** Same behavior as `POST /search_players`. */
router.post("/search", searchHandler);

/** Same behavior as `POST /get_player`. */
router.post("/validate", validateHandler);

router.post("/resolve_pair", resolvePairHandler);

export const playersRouter = router;
