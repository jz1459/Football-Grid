/**
 * Load Postgres from nflverse season rosters (CSV — same source as R `nflreadr::load_rosters`).
 *
 * Seasons and team seeding: repo root `config/game.json` (see `GAME_CONFIG_PATH` in `.env.example`).
 * Run: `npm run db:load_data` from `backend/`.
 */
import { config } from "dotenv";
import { resolve } from "path";

import { PrismaClient } from "@prisma/client";

import {
  fetchNflverseRosterRows,
  fetchNflverseTeamAbbrevToDisplayName,
  gridPositionFromNflverseRow,
  resolveTeamDisplayName,
} from "./nflverse";
import { persistValidPairsFromDb } from "../src/lib/generateValidPairs";
import { getGameConfig } from "../src/lib/gameConfig";
import { rosterSeasonYears, rosterSeasonRangeLabel } from "../src/lib/rosterSeasonConfig";

config({ path: resolve(__dirname, "../.env") });

/** Seasons: `rosterSeasonYears` in `config/game.json` if set, else inclusive `rosterSeason` range. */
function resolveSeasons(): number[] {
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
  const gc = getGameConfig();
  const seasons = resolveSeasons();
  const seasonMode =
    gc.rosterSeasonYears && gc.rosterSeasonYears.length > 0
      ? "rosterSeasonYears in config/game.json"
      : `rosterSeason ${rosterSeasonRangeLabel()} (config/game.json)`;
  console.log(`Seasons: ${seasons.length ? `${seasons[0]}…${seasons[seasons.length - 1]}` : "(none)"} (${seasonMode})`);
  const abbrevToDisplay = await fetchNflverseTeamAbbrevToDisplayName();

  let totalRosterRowsApplied = 0;

  for (const season of seasons) {
    console.log(`--- Season ${season} (nflverse load_rosters CSV) ---`);
    const rows = await fetchNflverseRosterRows(season);

    const testSet = new Set(gc.seed.testTeamAbbrevs);
    let seasonRowsApplied = 0;

    for (const row of rows) {
      const abbr = row.team.trim().toUpperCase();
      if (!gc.seed.seedAllNflTeams && !testSet.has(abbr)) continue;

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
    await sleep(gc.loadDataPauseMs);
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
