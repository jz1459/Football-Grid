import { existsSync, readFileSync } from "fs";
import { isAbsolute, join, resolve } from "path";

/**
 * Single source of truth for roster seasons and seed behavior. Default path: repo `config/game.json`
 * (three levels above `dist/lib` or `src/lib`). Override with env `GAME_CONFIG_PATH` (absolute or relative to `process.cwd()`).
 */
export type GameConfigFile = {
  rosterSeason: { start: number; end: number };
  /** If non-empty, these exact seasons are used instead of `rosterSeason` range. */
  rosterSeasonYears: number[] | null;
  seed: {
    seedAllNflTeams: boolean;
    testTeamAbbrevs: string[];
  };
  loadDataPauseMs: number;
};

let cache: GameConfigFile | null = null;

/** Repo layout: `config/game.json` at monorepo root, or `backend/config/game.json` in Docker. */
function defaultConfigCandidates(): string[] {
  const fromDistOrSrcLib = __dirname;
  return [
    join(fromDistOrSrcLib, "..", "..", "..", "config", "game.json"),
    join(fromDistOrSrcLib, "..", "..", "config", "game.json"),
  ];
}

function resolveConfigFilePath(): string {
  const override = process.env.GAME_CONFIG_PATH?.trim();
  if (override) {
    return isAbsolute(override) ? override : resolve(process.cwd(), override);
  }
  for (const p of defaultConfigCandidates()) {
    if (existsSync(p)) return p;
  }
  return defaultConfigCandidates()[0]!;
}

function isNum(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function parseAndValidate(raw: unknown): GameConfigFile {
  if (raw === null || typeof raw !== "object") {
    throw new Error("game.json must be a JSON object");
  }
  const o = raw as Record<string, unknown>;

  const rs = o.rosterSeason;
  if (rs === null || typeof rs !== "object") {
    throw new Error("game.json: missing or invalid `rosterSeason` object");
  }
  const rso = rs as Record<string, unknown>;
  if (!isNum(rso.start) || !isNum(rso.end)) {
    throw new Error("game.json: `rosterSeason.start` and `rosterSeason.end` must be numbers");
  }
  if (rso.start > rso.end) {
    throw new Error(`game.json: rosterSeason.start (${rso.start}) must be <= end (${rso.end})`);
  }

  let rosterSeasonYears: number[] | null = null;
  if (o.rosterSeasonYears != null) {
    if (!Array.isArray(o.rosterSeasonYears)) {
      throw new Error("game.json: `rosterSeasonYears` must be an array of numbers or null");
    }
    rosterSeasonYears = o.rosterSeasonYears.map((y, i) => {
      if (!isNum(y)) throw new Error(`game.json: rosterSeasonYears[${i}] must be a number`);
      return y;
    });
  }

  const seed = o.seed;
  if (seed === null || typeof seed !== "object") {
    throw new Error("game.json: missing or invalid `seed` object");
  }
  const so = seed as Record<string, unknown>;
  if (typeof so.seedAllNflTeams !== "boolean") {
    throw new Error("game.json: `seed.seedAllNflTeams` must be a boolean");
  }
  if (!Array.isArray(so.testTeamAbbrevs)) {
    throw new Error("game.json: `seed.testTeamAbbrevs` must be an array of strings");
  }
  const testTeamAbbrevs = so.testTeamAbbrevs.map((a, i) => {
    if (typeof a !== "string") throw new Error(`game.json: testTeamAbbrevs[${i}] must be a string`);
    return a.trim().toUpperCase();
  });

  let loadDataPauseMs = 200;
  if (o.loadDataPauseMs !== undefined) {
    if (!isNum(o.loadDataPauseMs) || o.loadDataPauseMs < 0) {
      throw new Error("game.json: `loadDataPauseMs` must be a non-negative number");
    }
    loadDataPauseMs = Math.floor(o.loadDataPauseMs);
  }

  return {
    rosterSeason: { start: Math.floor(rso.start), end: Math.floor(rso.end) },
    rosterSeasonYears,
    seed: { seedAllNflTeams: so.seedAllNflTeams, testTeamAbbrevs },
    loadDataPauseMs,
  };
}

/** Loads and validates `config/game.json` once per process. */
export function getGameConfig(): GameConfigFile {
  if (cache) return cache;
  const path = resolveConfigFilePath();
  if (!existsSync(path)) {
    const tried = [path, ...defaultConfigCandidates().filter((p) => p !== path)];
    throw new Error(
      `Game config not found. Tried:\n${[...new Set(tried)].join("\n")}\nCreate config/game.json (repo root or backend/config/) or set GAME_CONFIG_PATH.`,
    );
  }
  const text = readFileSync(path, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Invalid JSON in game config (${path}): ${msg}`);
  }
  cache = parseAndValidate(parsed);
  return cache;
}
