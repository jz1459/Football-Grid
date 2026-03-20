/**
 * nflverse season rosters — same source as R `nflreadr::load_rosters()`:
 * https://github.com/nflverse/nflverse-data/releases/tag/rosters
 *
 * This is season-level snapshot data (not weekly union). For weekly history,
 * use `load_rosters_weekly()` in R or add a separate importer later.
 */

import { parse } from "csv-parse/sync";

import { ESPN_POS_TO_GRID } from "./espn";

/** GitHub release assets (stable URL; redirects to CDN). */
export const NFLVERSE_ROSTER_CSV_TMPL =
  "https://github.com/nflverse/nflverse-data/releases/download/rosters/roster_{season}.csv";

export const NFLVERSE_TEAMS_CSV =
  "https://github.com/nflverse/nflverse-data/releases/download/teams/teams_colors_logos.csv";

export const NFLVERSE_REQUEST_HEADERS = {
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
 * Map nflverse `team` abbrev → Football Grid `Team.name` (aligned with ESPN seed list).
 * Covers historical franchises (STL Rams → Los Angeles Rams, etc.).
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

/** Roster `status` values to skip (clearly not on club roster for grid purposes). */
const EXCLUDED_STATUSES = new Set([
  "CUT",
  "UFA",
  "TRC",
  "TRD",
  "TRT",
  "RFA",
  "NWT",
]);

export interface NflverseRosterRow {
  season: string;
  team: string;
  position: string;
  depth_chart_position: string;
  status: string;
  full_name: string;
}

function normalizeTeamAbbrev(abbr: string): string {
  const u = abbr.trim().toUpperCase();
  return TEAM_ABBREV_NORMALIZE[u] ?? u;
}

/**
 * Build team abbrev → display name from nflverse teams CSV, then apply franchise overrides.
 */
export async function fetchNflverseTeamAbbrevToDisplayName(): Promise<Map<string, string>> {
  const r = await fetch(NFLVERSE_TEAMS_CSV, { headers: NFLVERSE_REQUEST_HEADERS });
  if (!r.ok) throw new Error(`nflverse teams CSV ${r.status}`);
  const text = await r.text();
  const rows = parse(text, { columns: true, skip_empty_lines: true, relax_column_count: true }) as Record<
    string,
    string
  >[];
  const map = new Map<string, string>();
  for (const row of rows) {
    const ab = row.team_abbr?.trim().toUpperCase();
    const name = row.team_name?.trim();
    if (!ab || !name) continue;
    map.set(ab, name);
  }
  for (const [alias, canonical] of Object.entries(TEAM_ABBREV_NORMALIZE)) {
    const n = map.get(canonical);
    if (n) map.set(alias, n);
  }
  for (const [abbr, display] of Object.entries(FRANCHISE_DISPLAY_OVERRIDES)) {
    map.set(abbr, display);
  }
  return map;
}

export function rosterCsvUrl(season: number): string {
  return NFLVERSE_ROSTER_CSV_TMPL.replace("{season}", String(season));
}

export async function fetchNflverseRosterRows(season: number): Promise<NflverseRosterRow[]> {
  const url = rosterCsvUrl(season);
  const res = await fetch(url, { headers: NFLVERSE_REQUEST_HEADERS });
  if (!res.ok) throw new Error(`nflverse roster ${season}: ${res.status}`);
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
  }));
}

export function gridPositionFromNflverseRow(row: NflverseRosterRow): string | null {
  const raw = row.position?.trim() || row.depth_chart_position?.trim();
  if (!raw) return null;
  const g = ESPN_POS_TO_GRID[raw];
  return g ?? null;
}

export function shouldIncludeNflverseStatus(status: string): boolean {
  const s = status.trim().toUpperCase();
  if (!s) return true;
  return !EXCLUDED_STATUSES.has(s);
}

/**
 * Resolve nflverse roster `team` abbrev to Football Grid `Team.name`.
 */
export function resolveTeamDisplayName(
  teamAbbrev: string,
  abbrevToDisplay: Map<string, string>
): string | null {
  const raw = teamAbbrev.trim().toUpperCase();
  const n = normalizeTeamAbbrev(raw);
  if (FRANCHISE_DISPLAY_OVERRIDES[n]) return FRANCHISE_DISPLAY_OVERRIDES[n];
  if (FRANCHISE_DISPLAY_OVERRIDES[raw]) return FRANCHISE_DISPLAY_OVERRIDES[raw];
  return abbrevToDisplay.get(n) ?? abbrevToDisplay.get(raw) ?? null;
}
