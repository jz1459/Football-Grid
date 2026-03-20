/**
 * Seed Postgres from ESPN NFL rosters (JSON). Uses only DATABASE_URL from backend-ts/.env
 * (load via dotenv below). Edit constants in this file — no SCRAPE_SOURCE switching.
 *
 * Run from backend-ts: npm run db:seed
 */
import { config } from "dotenv";
import { resolve } from "path";

import { PrismaClient } from "@prisma/client";

import {
  ESPN_POS_TO_GRID,
  NFL_TEAM_DISPLAY_NAMES,
  fetchEspnDisplayNameToTeamId,
  fetchRosterAthletes,
  seasonRangeInclusive,
} from "./espn";

config({ path: resolve(__dirname, "../.env") });

// --- configure here ---
/** `true` = all 32 teams; `false` = only TEST_TEAM_DISPLAY_NAMES */
const SEED_ALL_NFL_TEAMS = false;

const TEST_TEAM_DISPLAY_NAMES = ["New York Giants", "Buffalo Bills"] as const;

/**
 * Which seasons to load (union of rosters into the DB — no per-season column).
 *
 * - Leave empty and set `SEASON_RANGE` to null → **current** roster only (no `?season=`).
 * - Non-empty `SEASON_YEARS` → explicit list (deduped + sorted); **wins over** `SEASON_RANGE`.
 * - If `SEASON_YEARS` is empty and `SEASON_RANGE` is set → inclusive `{ start, end }`.
 *
 * Examples:
 *   `const SEASON_YEARS: number[] = [2024];`
 *   `const SEASON_YEARS: number[] = [2020, 2021, 2022];`
 *   `const SEASON_RANGE = { start: 2015, end: 2024 };` // last 10 calendar years
 */
const SEASON_YEARS: number[] = [];

/**
 * Used only when `SEASON_YEARS` is empty. `null` = current roster only.
 * Example: `{ start: 2016, end: 2025 }` for an inclusive range.
 */
const SEASON_RANGE: { start: number; end: number } | null = { start: 2020, end: 2025 };

const PAUSE_MS = 400;
// --- end config ---

function resolveSeasons(): number[] | undefined {
  if (SEASON_YEARS.length > 0) {
    return [...new Set(SEASON_YEARS)].sort((a, b) => a - b);
  }
  if (SEASON_RANGE != null) {
    return seasonRangeInclusive(SEASON_RANGE.start, SEASON_RANGE.end);
  }
  return undefined;
}

const prisma = new PrismaClient();

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function gridPosition(espnAbbr: string): string | null {
  const g = ESPN_POS_TO_GRID[espnAbbr];
  if (g) return g;
  return null;
}

function clipName(name: string, maxLen: number): string {
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen);
}

async function main(): Promise<void> {
  const teamsToSeed = SEED_ALL_NFL_TEAMS
    ? [...NFL_TEAM_DISPLAY_NAMES]
    : [...TEST_TEAM_DISPLAY_NAMES];

  const seasons = resolveSeasons();
  /** One pass per season; `undefined` = current roster (no `?season=`). */
  const seasonPasses: (number | undefined)[] =
    seasons === undefined ? [undefined] : seasons;

  const nameToId = await fetchEspnDisplayNameToTeamId();
  let totalAthletesProcessed = 0;

  for (const season of seasonPasses) {
    const seasonLabel = season === undefined ? "current" : String(season);
    console.log(`--- Season ${seasonLabel} ---`);

    for (const displayName of teamsToSeed) {
      const tid = nameToId.get(displayName);
      if (!tid) {
        console.warn(`No ESPN id for ${displayName}`);
        continue;
      }

      let team = await prisma.team.findFirst({ where: { name: displayName } });
      if (!team) {
        team = await prisma.team.create({ data: { name: displayName } });
      }

      const { athletes, source } = await fetchRosterAthletes(tid, season, {
        coreAthletePauseMs: Math.min(120, PAUSE_MS),
      });

      for (const a of athletes) {
        const abbr = a.position?.abbreviation ?? "";
        if (!abbr) continue;
        const pos = gridPosition(abbr);
        if (!pos) continue;

        const rawName = a.fullName ?? a.displayName ?? "";
        if (!rawName) continue;
        const name = clipName(rawName, 40);

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
        totalAthletesProcessed += 1;
      }

      console.log(
        `  ${displayName} (${seasonLabel}): ${athletes.length} athletes (${source})`,
      );
      await sleep(PAUSE_MS);
    }
  }

  console.log(
    `Done. Athlete rows processed (union across seasons): ${totalAthletesProcessed}`,
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
