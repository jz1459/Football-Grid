import fs from "fs";
import path from "path";
import type { PrismaClient } from "@prisma/client";

/** Canonical key for an unordered team-name pair. Puts the smaller team name first to ensure consistent ordering.*/
export function pairKey(teamA: string, teamB: string): string {
  return teamA.localeCompare(teamB) < 0 ? `${teamA}\0${teamB}` : `${teamB}\0${teamA}`;
}

/**
 * All unordered team pairs (by display name) such that at least one player is linked to both teams. Allows for quick lookup of valid pairs to use in the board generation.
 */
export async function buildValidPairSet(client: PrismaClient): Promise<Set<string>> {
  // Get all the player team relationships from the database
  const rows = await client.playerTeam.findMany({
    select: { playerId: true, team: { select: { name: true } } },
  });

  // Group the player team relationships by player id
  const byPlayer = new Map<number, string[]>();

  // For each player team relationship, add the team name to the list of team names for that player
  for (const row of rows) {
    const list = byPlayer.get(row.playerId) ?? [];
    list.push(row.team.name);
    byPlayer.set(row.playerId, list);
  }

  // For each player, create all possible unordered team pairs and add them to the set
  const pairs = new Set<string>();
  for (const names of byPlayer.values()) {
    const uniq = [...new Set(names)];
    for (let i = 0; i < uniq.length; i += 1) {
      for (let j = i + 1; j < uniq.length; j += 1) {
        pairs.add(pairKey(uniq[i]!, uniq[j]!));
      }
    }
  }
  return pairs;
}

/** `backend/data/valid-pairs.json` — works from `src/lib` and `dist/lib`. */
export function getValidPairsJsonPath(): string {
  return path.join(__dirname, "..", "..", "data", "valid-pairs.json");
}

export function readValidPairSetFromFile(): Set<string> | null {
  try {
    const p = getValidPairsJsonPath();
    if (!fs.existsSync(p)) return null;
    const raw: unknown = JSON.parse(fs.readFileSync(p, "utf8"));
    if (!Array.isArray(raw) || raw.some((x) => typeof x !== "string")) return null;
    return new Set(raw);
  } catch {
    return null;
  }
}

/** Writes the valid team-pair set to `data/valid-pairs.json`. */
export function writeValidPairsFile(set: Set<string>): void {
  const p = getValidPairsJsonPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify([...set]), "utf8");
}

/** Rebuild set from DB and write `data/valid-pairs.json` (call after `load_data` or roster changes). */
export async function persistValidPairsFromDb(client: PrismaClient): Promise<Set<string>> {
  const set = await buildValidPairSet(client);
  writeValidPairsFile(set);
  return set;
}
