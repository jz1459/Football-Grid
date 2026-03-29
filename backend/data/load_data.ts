/**
 * Load Postgres from nflverse season rosters (CSV — same source as R `nflreadr::load_rosters`).
 *
 * Seasons and team seeding: repo root `config/game.json` (see `GAME_CONFIG_PATH` in `.env.example`).
 * Run: `npm run db:load_data` from `backend/`.
 */
import { config } from "dotenv";
import { resolve } from "path";

import { PrismaClient } from "@prisma/client";

import { createTeamNameMap, fetchRoster, getPosition, getTeam } from "./nflverse";
import { persistValidPairsFromDb } from "../src/lib/generateValidPairs";
import { getGameConfig } from "../src/lib/gameConfig";
import { rosterSeasonYears, rosterSeasonRangeLabel } from "../src/lib/rosterSeasonConfig";

// Load the environment variables from the .env file
config({ path: resolve(__dirname, "../.env") });

/** Seasons: `rosterSeasonYears` in `config/game.json` if set, else inclusive `rosterSeason` range. */
function getSeasons(): number[] {
  const gc = getGameConfig();
  if (gc.rosterSeasonYears && gc.rosterSeasonYears.length > 0) {
    return [...new Set(gc.rosterSeasonYears)].sort((a, b) => a - b);
  }
  return rosterSeasonYears();
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
 * Upsert a player by their gsis_id, so that if the player already exists by gsis_id, update the player row, otherwise create a new player row
 * If a player already exists with a different position, update the player row with the new position to prevent duplicate players.
 * One `Player` row per nflverse `gsis_id`. Rows with missing `gsis_id` are skipped (logged per season).
 */
async function upsertPlayer(name: string, pos: string, gsis: string): Promise<{ id: number }> {
  return prisma.player.upsert({
    where: { gsisId: gsis },
    create: { name, position: pos, gsisId: gsis },
    update: { name, position: pos },
  });
}

/**
 * For each configured season: fetch nflverse CSV, ensure `Team` + `Player` (by GSIS),
 * then `PlayerTeam` upserts for every roster row that passes team/position filters.
 */
async function main(): Promise<void> {
  const gc = getGameConfig();

  // Grab the seasons from the game config file if provided in rosterSeasonYears, otherwise use the entire rosterSeason range
  const seasons = getSeasons();

  // Log the seasons and the mode of the seasons
  const seasonMode =
    gc.rosterSeasonYears && gc.rosterSeasonYears.length > 0
      ? "rosterSeasonYears in config/game.json"
      : `rosterSeason ${rosterSeasonRangeLabel()} (config/game.json)`;
  console.log(`Seasons: ${seasons.length ? `${seasons[0]}…${seasons[seasons.length - 1]}` : "(none)"} (${seasonMode})`);

  // Fetch the team abbrev to display name map (dictionary)
  const teamNameMap = await createTeamNameMap();

  let totalRosterRowsApplied = 0;

  // For each season, fetch the nflverse roster CSV, ensure `Team` + `Player` (by GSIS), then `PlayerTeam` upserts for every roster row that passes team/position filters.
  for (const season of seasons) {
    console.log(`--- Season ${season} (nflverse load_rosters CSV) ---`);

    // Fetch the nflverse roster CSV for the season
    const rows = await fetchRoster(season);

    const testSet = new Set(gc.load.testTeamAbbrevs);
    let seasonRowsApplied = 0;
    let skippedNoGsis = 0;

    for (const row of rows) {
      const abbr = row.team.trim().toUpperCase();
      // If the loadAllNflteams flag is not set and the team abbrev is not in the test set, skip the row
      if (!gc.load.loadAllNflteams && !testSet.has(abbr)) continue;

      //Get the team name from the team name map
      const teamName = getTeam(row.team, teamNameMap);
      if (!teamName) {
        console.warn(`Unknown team abbrev: ${row.team}`);
        continue;
      }

      // Get the position from the roster row
      const pos = getPosition(row);
      if (!pos) continue;

      // Clean up data
      const rawName = row.full_name?.trim() ?? "";
      if (!rawName) continue;
      const name = clipName(rawName, 40);

      let team = await prisma.team.findFirst({ where: { name: teamName } });
      if (!team) {
        team = await prisma.team.create({ data: { name: teamName } });
      }

      const gsis = row.gsis_id?.trim() ?? "";
      if (!gsis) {
        skippedNoGsis += 1;
        continue;
      }

      // Upsert the player
      const player = await upsertPlayer(name, pos, gsis);
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
    if (skippedNoGsis > 0) {
      console.log(`  Season ${season}: skipped ${skippedNoGsis} rows with empty gsis_id`);
    }

    // Sleep for the load data pause time to avoid overwhelming the database
    await sleep(gc.loadDataPauseMs);
  }

  console.log(
    `Done (nflverse). Total roster row operations: ${totalRosterRowsApplied} (Player rows are fewer — one per gsis_id)`,
  );

  // Generate the valid pairs (i.e all team pairs that have at least one player in common) and persist them to backend/data/valid-pairs.json
  // Avoids scenario where board generates a cell with no valid answer
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
