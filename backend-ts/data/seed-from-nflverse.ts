/**
 * Seed Postgres from nflverse season rosters (CSV — same source as R `nflreadr::load_rosters`).
 * Keeps ESPN seed separate: `npm run db:seed` still uses `seed-from-espn.ts`.
 *
 * Run: npm run db:seed:nflverse
 */
import { config } from "dotenv";
import { resolve } from "path";

import { PrismaClient } from "@prisma/client";

import { seasonRangeInclusive } from "./espn";
import {
  fetchNflverseRosterRows,
  fetchNflverseTeamAbbrevToDisplayName,
  gridPositionFromNflverseRow,
  resolveTeamDisplayName,
  shouldIncludeNflverseStatus,
} from "./nflverse";

config({ path: resolve(__dirname, "../.env") });

// --- configure here ---
const SEED_ALL_NFL_TEAMS = true;

/** nflverse `team` abbreviations (e.g. NYG, BUF) — used when SEED_ALL_NFL_TEAMS is false */
const TEST_TEAM_ABBREVS: string[] = ["NYG", "BUF"];

const SEASON_YEARS: number[] = [];

const SEASON_RANGE: { start: number; end: number } | null = { start: 2015, end: 2025 };

const PAUSE_MS = 200;
// --- end config ---

function resolveSeasons(): number[] {
  if (SEASON_YEARS.length > 0) {
    return [...new Set(SEASON_YEARS)].sort((a, b) => a - b);
  }
  if (SEASON_RANGE != null) {
    return seasonRangeInclusive(SEASON_RANGE.start, SEASON_RANGE.end);
  }
  throw new Error("Set SEASON_YEARS or SEASON_RANGE for nflverse seed.");
}

const prisma = new PrismaClient();

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function clipName(name: string, maxLen: number): string {
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen);
}

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

      if (!shouldIncludeNflverseStatus(row.status)) continue;

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

      const player = await prisma.player.upsert({
        where: {
          player_unique: { name, position: pos },
        },
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
