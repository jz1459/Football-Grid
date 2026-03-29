/**
 * nflverse season rosters — same source as R `nflreadr::load_rosters()`:
 * https://github.com/nflverse/nflverse-data/releases/tag/rosters
 */

import { parse } from "csv-parse/sync";

import { POSITIONS } from "./positions";

/** GitHub release assets (stable URL; redirects to CDN). */
export const ROSTER_CSV_TMPL =
  "https://github.com/nflverse/nflverse-data/releases/download/rosters/roster_{season}.csv";

export const TEAMS_CSV =
  "https://github.com/nflverse/nflverse-data/releases/download/teams/teams_colors_logos.csv";

export const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; FootballGrid/1.0; +https://github.com/nflverse/nflverse-data)",
  Accept: "text/csv,*/*",
} as const;

/** Alternate abbreviations seen in older roster files → modern nflverse abbrev. */
const TEAM_ABBREV_NORMALIZE: Record<string, string> = {
  ARZ: "ARI",
  BLT: "BAL",
  CLV: "CLE",
  HST: "HOU",
  JAC: "JAX",
  SL: "STL",
};

/**
 * Handle franchise name overrides for historical teams
 */
const FRANCHISE_DISPLAY_OVERRIDES: Record<string, string> = {
  LA: "Los Angeles Rams",
  LAR: "Los Angeles Rams",
  STL: "Los Angeles Rams",
  SL: "Los Angeles Rams",
  SD: "Los Angeles Chargers",
  LAC: "Los Angeles Chargers",
  OAK: "Las Vegas Raiders",
  LV: "Las Vegas Raiders",
  WAS: "Washington Commanders",
  WSH: "Washington Commanders",
};

/** Interface for a single row from the roster CSV */
export interface RosterRow {
  season: string;
  team: string;
  position: string;
  depth_chart_position: string;
  status: string;
  full_name: string;
  /** NFL GSIS id when present — stable across seasons/positions. Used to identify players across seasons. */
  gsis_id: string;
}

/** Maps legacy / alias team abbreviations (e.g. `JAC`) to the canonical abbrev used in URLs and maps. */
function normalizeTeamAbbrev(abbr: string): string {
  const u = abbr.trim().toUpperCase();
  return TEAM_ABBREV_NORMALIZE[u] ?? u;
}

/**
 * Build team abbrev → display name from CSV, then apply franchise overrides.
 * i.e. `JAC` → `Jacksonville Jaguars`, `STL` → `Los Angeles Rams`, etc.
 */
export async function createTeamNameMap(): Promise<Map<string, string>> {
  const r = await fetch(TEAMS_CSV, { headers: REQUEST_HEADERS });
  if (!r.ok) throw new Error(`CSV ${r.status}`);
  const text = await r.text();
  const rows = parse(text, { columns: true, skip_empty_lines: true, relax_column_count: true }) as Record<
    string,
    string
  >[];

  // Create a map of team abbreviations to team names
  const map = new Map<string, string>();
  for (const row of rows) {
    const ab = row.team_abbr?.trim().toUpperCase();
    const name = row.team_name?.trim();
    if (!ab || !name) continue;
    map.set(ab, name);
  }

  // Apply the team abbreviation normalization
  for (const [alias, canonical] of Object.entries(TEAM_ABBREV_NORMALIZE)) {
    const n = map.get(canonical);
    if (n) map.set(alias, n);
  }

  // Apply the franchise name overrides
  for (const [abbr, display] of Object.entries(FRANCHISE_DISPLAY_OVERRIDES)) {
    map.set(abbr, display);
  }
  return map;
}

/** Absolute URL for the `roster_{season}.csv`. */
export function rosterCsvUrl(season: number): string {
  return ROSTER_CSV_TMPL.replace("{season}", String(season));
}

/** Downloads and parses one season’s roster CSV into trimmed `RosterRow` objects. */
export async function fetchRoster(season: number): Promise<RosterRow[]> {
  const url = rosterCsvUrl(season);
  const res = await fetch(url, { headers: REQUEST_HEADERS });
  if (!res.ok) throw new Error(`roster ${season}: ${res.status}`);
  const text = await res.text();
  const rows = parse(text, { columns: true, skip_empty_lines: true, relax_column_count: true }) as Record<
    string,
    string
  >[];
  return rows.map((row) => ({
    season: row.season ?? "",
    team: row.team ?? "",
    position: row.position ?? "",
    depth_chart_position: row.depth_chart_position ?? "",
    status: row.status ?? "",
    full_name: row.full_name ?? "",
    gsis_id: (row.gsis_id ?? "").trim(),
  }));
}

/**
 * Maps `position` / `depth_chart_position` to normalized positionvia `POSITIONS`
 * (e.g. `OLB` → `LB`). Returns `null` if the abbrev is unknown.
 */
export function getPosition(row: RosterRow): string | null {
  const raw = row.position?.trim() || row.depth_chart_position?.trim();
  if (!raw) return null;
  const g = POSITIONS[raw];
  return g ?? null;
}

/**
 * Turns a roster row’s `team` abbrev into the display string stored on `Team.name` in the DB
 * (teams CSV + normalizations + franchise renames). Returns `null` if the abbrev is unknown.
 * i.e. `JAC` → `Jacksonville Jaguars`, `STL` → `Los Angeles Rams`, etc.
 */
export function getTeam(teamAbbrev: string, teamNameMap: Map<string, string>): string | null {
  const raw = teamAbbrev.trim().toUpperCase();
  const n = normalizeTeamAbbrev(raw);
  if (FRANCHISE_DISPLAY_OVERRIDES[n]) return FRANCHISE_DISPLAY_OVERRIDES[n];
  if (FRANCHISE_DISPLAY_OVERRIDES[raw]) return FRANCHISE_DISPLAY_OVERRIDES[raw];
  return teamNameMap.get(n) ?? teamNameMap.get(raw) ?? null;
}
