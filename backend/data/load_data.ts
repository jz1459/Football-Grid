/**
 * Load Postgres from nflverse season rosters (CSV — same source as R `nflreadr::load_rosters`).
 *
 * Run: npm run db:seed — or repo root `./load_data.sh`
 */
import { config } from "dotenv";
import { resolve } from "path";

import { PrismaClient } from "@prisma/client";

import { seasonRangeInclusive } from "./positions";
import {
  fetchNflverseRosterRows,
  fetchNflverseTeamAbbrevToDisplayName,
  gridPositionFromNflverseRow,
  resolveTeamDisplayName,
} from "./nflverse";
import { persistValidPairsFromDb } from "../src/lib/generateValidPairs";

config({ path: resolve(__dirname, "../.env") });

// --- configure here ---
const SEED_ALL_NFL_TEAMS = true;

/** nflverse `team` abbreviations (e.g. NYG, BUF) — used when SEED_ALL_NFL_TEAMS is false */
const TEST_TEAM_ABBREVS: string[] = ["NYG", "BUF"];

const SEASON_YEARS: number[] = [];

const SEASON_RANGE: { start: number; end: number } | null = { start: 2015, end: 2025 };

const PAUSE_MS = 200;
// --- end config ---

/** Derives the ordered list of NFL seasons to download from `SEASON_YEARS` or `SEASON_RANGE`. */
function resolveSeasons(): number[] {
  if (SEASON_YEARS.length > 0) {
    return [...new Set(SEASON_YEARS)].sort((a, b) => a - b);
  }
  if (SEASON_RANGE != null) {
    return seasonRangeInclusive(SEASON_RANGE.start, SEASON_RANGE.end);
  }
  throw new Error("Set SEASON_YEARS or SEASON_RANGE in data/load_data.ts.");
}

const prisma = new PrismaClient();

/** Promise-based delay between remote season fetches to reduce burst load on GitHub / CDN. */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Truncates player names to the DB column width (`players.name` VarChar). */
function clipName(name: string, maxLen: number): string {
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen);
}

/**
 * Ensure one Player row for this nflverse identity: GSIS wins; merge away a separate (name, position)
 * row when it would block updating the GSIS row (e.g. DL/LB duplicate rows left from older data).
 */
async function upsertPlayerFromNflverse(name: string, pos: string, gsis: string): Promise<{ id: number }> {
  const byGsis = await prisma.player.findUnique({ where: { gsisId: gsis } });
  const byNamePos = await prisma.player.findUnique({
    where: { player_unique: { name, position: pos } },
  });

  if (byGsis) {
    return prisma.$transaction(async (tx) => {
      if (byNamePos && byNamePos.id !== byGsis.id) {
        const links = await tx.playerTeam.findMany({ where: { playerId: byNamePos.id } });
        for (const link of links) {
          await tx.playerTeam.upsert({
            where: { playerId_teamId: { playerId: byGsis.id, teamId: link.teamId } },
            create: { playerId: byGsis.id, teamId: link.teamId },
            update: {},
          });
        }
        await tx.player.delete({ where: { id: byNamePos.id } });
      }
      return tx.player.update({
        where: { id: byGsis.id },
        data: { name, position: pos },
      });
    });
  }

  if (byNamePos) {
    return prisma.player.update({
      where: { id: byNamePos.id },
      data: { gsisId: gsis, name, position: pos },
    });
  }

  return prisma.player.create({
    data: { name, position: pos, gsisId: gsis },
  });
}

/**
 * For each configured season: fetch nflverse CSV, ensure `Team` + `Player` (+ `gsisId` merge rules),
 * then `PlayerTeam` upserts for every roster row that passes team/position filters.
 */
async function main(): Promise<void> {
  const seasons = resolveSeasons();
  const abbrevToDisplay = await fetchNflverseTeamAbbrevToDisplayName();

  let totalRosterRowsApplied = 0;

  for (const season of seasons) {
    console.log(`--- Season ${season} (nflverse load_rosters CSV) ---`);
    const rows = await fetchNflverseRosterRows(season);

    const testSet = new Set(TEST_TEAM_ABBREVS);
    let seasonRowsApplied = 0;

    for (const row of rows) {
      const abbr = row.team.trim().toUpperCase();
      if (!SEED_ALL_NFL_TEAMS && !testSet.has(abbr)) continue;

      const teamName = resolveTeamDisplayName(row.team, abbrevToDisplay);
      if (!teamName) {
        console.warn(`Unknown team abbrev: ${row.team}`);
        continue;
      }

      const pos = gridPositionFromNflverseRow(row);
      if (!pos) continue;

      const rawName = row.full_name?.trim() ?? "";
      if (!rawName) continue;
      const name = clipName(rawName, 40);

      let team = await prisma.team.findFirst({ where: { name: teamName } });
      if (!team) {
        team = await prisma.team.create({ data: { name: teamName } });
      }

      const gsis = row.gsis_id?.trim() ?? "";
      const player = gsis
        ? await upsertPlayerFromNflverse(name, pos, gsis)
        : await prisma.player.upsert({
            where: { player_unique: { name, position: pos } },
            create: { name, position: pos },
            update: {},
          });

      await prisma.playerTeam.upsert({
        where: {
          playerId_teamId: { playerId: player.id, teamId: team.id },
        },
        create: { playerId: player.id, teamId: team.id },
        update: {},
      });
      seasonRowsApplied += 1;
      totalRosterRowsApplied += 1;
    }

    console.log(`  Season ${season}: ${seasonRowsApplied} roster rows applied (after filters)`);
    await sleep(PAUSE_MS);
  }

  console.log(
    `Done (nflverse). Total roster row operations: ${totalRosterRowsApplied} (Player rows are fewer — unique name+position)`,
  );

  const pairSet = await persistValidPairsFromDb(prisma);
  console.log(`Wrote data/valid-pairs.json (${pairSet.size} valid team pairs).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
