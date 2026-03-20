import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { createSearchRateLimiter } from "../middleware/rateLimit";
import { createValidateRateLimiter } from "../middleware/rateLimit";

const prisma = new PrismaClient();
const router = Router();

interface SearchBody {
  searchTerm?: string;
  limit?: number;
}

interface ValidateBody {
  playerName?: string;
  position?: string;
}

export async function searchHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as SearchBody;
  const searchTerm = body.searchTerm ?? "";
  const limit = Math.min(Math.max(body.limit ?? 10, 1), 50);

  const players = await prisma.player.findMany({
    where: {
      name: { contains: searchTerm, mode: "insensitive" },
    },
    orderBy: { name: "asc" },
    take: limit,
    select: { name: true, position: true },
  });

  const result = players.map((p) => ({ name: p.name, position: p.position }));
  res.json(result);
}

export async function validateHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as ValidateBody;
  const playerName = body.playerName?.trim();
  const position = body.position?.trim();

  if (!playerName) {
    res.status(400).json({ error: "playerName is required" });
    return;
  }

  const where: { name: string; position?: string } = { name: playerName };
  if (position) {
    where.position = position;
  } else {
    const withPosition = await prisma.player.findMany({
      where: { name: playerName },
      select: { id: true },
    });
    if (withPosition.length > 1) {
      res.status(400).json({
        error: "Multiple players with this name; include position (e.g. from suggestion).",
      });
      return;
    }
  }

  const player = await prisma.player.findFirst({
    where,
    include: {
      playerTeams: {
        include: { team: { select: { name: true } } },
      },
    },
  });

  if (!player) {
    res.status(404).json({ error: "Player not found" });
    return;
  }

  const teams = player.playerTeams.map((pt) => pt.team.name);
  res.json(teams);
}

router.post("/search", createSearchRateLimiter(), searchHandler);
router.post("/validate", createValidateRateLimiter(), validateHandler);

export const playersRouter = router;
