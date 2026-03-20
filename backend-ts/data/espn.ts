/**
 * ESPN site JSON (same endpoints their web app uses). Not a formally documented public API.
 *
 * Historical rosters: `site.api` roster often returns empty `athletes[].items` for past seasons.
 * Fallback uses `sports.core.api.espn.com` team athlete index + one request per athlete (see
 * `fetchRosterAthletes`).
 */

export const ESPN_NFL_TEAMS_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams?limit=32";

/** Core (hypermedia) API — season-scoped team rosters work when site roster JSON is empty. */
export const ESPN_CORE_NFL_BASE =
  "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl";

export function espnRosterUrl(teamId: string, season?: number): string {
  const base = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}/roster`;
  return season != null ? `${base}?season=${season}` : base;
}

export const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
} as const;

/** Map ESPN roster position abbreviations to Football Grid buckets. */
export const ESPN_POS_TO_GRID: Record<string, string> = {
  QB: "QB",
  RB: "RB",
  FB: "FB",
  WR: "WR",
  TE: "TE",
  OT: "OL",
  G: "OL",
  C: "OL",
  OL: "OL",
  DE: "DL",
  DT: "DL",
  NT: "DL",
  DL: "DL",
  EDGE: "LB",
  LB: "LB",
  ILB: "LB",
  OLB: "LB",
  MLB: "LB",
  CB: "DB",
  S: "DB",
  FS: "DB",
  SS: "DB",
  DB: "DB",
  K: "K",
  PK: "K",
  P: "P",
  LS: "LS",
};

export interface EspnAthlete {
  fullName?: string;
  displayName?: string;
  position?: { abbreviation?: string };
}

export interface EspnRosterGroup {
  position?: string;
  items?: EspnAthlete[];
}

export interface EspnRosterResponse {
  athletes?: EspnRosterGroup[];
}

export async function fetchEspnDisplayNameToTeamId(): Promise<Map<string, string>> {
  const r = await fetch(ESPN_NFL_TEAMS_URL, { headers: REQUEST_HEADERS });
  if (!r.ok) throw new Error(`ESPN teams ${r.status}`);
  const data = (await r.json()) as {
    sports: { leagues: { teams: { team: { displayName: string; id: string } }[] }[] }[];
  };
  const teams = data.sports[0].leagues[0].teams;
  const map = new Map<string, string>();
  for (const { team } of teams) {
    map.set(team.displayName, String(team.id));
  }
  return map;
}

export async function fetchEspnRosterJson(
  teamId: string,
  season?: number
): Promise<EspnRosterResponse> {
  const url = espnRosterUrl(teamId, season);
  const r = await fetch(url, { headers: REQUEST_HEADERS });
  if (!r.ok) throw new Error(`ESPN roster ${teamId} ${r.status}`);
  return (await r.json()) as EspnRosterResponse;
}

export function flattenAthletes(roster: EspnRosterResponse): EspnAthlete[] {
  const out: EspnAthlete[] = [];
  for (const grp of roster.athletes ?? []) {
    for (const a of grp.items ?? []) out.push(a);
  }
  return out;
}

export type EspnRosterSource = "site" | "core";

export interface FetchRosterAthletesResult {
  athletes: EspnAthlete[];
  source: EspnRosterSource;
}

interface CoreAthleteListItem {
  $ref?: string;
}

interface CoreAthletesPage {
  count?: number;
  pageCount?: number;
  items?: CoreAthleteListItem[];
}

/** Extract numeric athlete id from a core `$ref` URL. */
export function athleteIdFromCoreRef(ref: string): string | null {
  const m = /\/athletes\/(\d+)(?:\?|$)/.exec(ref);
  return m ? m[1] : null;
}

function coreTeamAthletesListUrl(teamId: string, season: number, page: number, limit: number): string {
  const q = new URLSearchParams({
    limit: String(limit),
    page: String(page),
    lang: "en",
    region: "us",
  });
  return `${ESPN_CORE_NFL_BASE}/seasons/${season}/teams/${teamId}/athletes?${q.toString()}`;
}

function coreAthleteDetailUrl(season: number, athleteId: string): string {
  const q = new URLSearchParams({ lang: "en", region: "us" });
  return `${ESPN_CORE_NFL_BASE}/seasons/${season}/athletes/${athleteId}?${q.toString()}`;
}

/** Core athlete JSON — position may be inlined with `abbreviation`. */
interface CoreAthleteDetail {
  fullName?: string;
  displayName?: string;
  position?: { abbreviation?: string };
}

function coreDetailToEspnAthlete(d: CoreAthleteDetail): EspnAthlete {
  const abbr = d.position?.abbreviation;
  return {
    fullName: d.fullName,
    displayName: d.displayName,
    position: abbr ? { abbreviation: abbr } : undefined,
  };
}

async function fetchCoreAthleteIdsForTeam(
  teamId: string,
  season: number
): Promise<string[]> {
  const limit = 200;
  const ids: string[] = [];
  let page = 1;
  let pageCount = 1;

  do {
    const url = coreTeamAthletesListUrl(teamId, season, page, limit);
    const r = await fetch(url, { headers: REQUEST_HEADERS });
    if (!r.ok) throw new Error(`ESPN core team athletes ${teamId} ${season} p${page}: ${r.status}`);
    const data = (await r.json()) as CoreAthletesPage;
    pageCount = Math.max(1, data.pageCount ?? 1);
    for (const it of data.items ?? []) {
      const ref = it.$ref;
      if (!ref) continue;
      const id = athleteIdFromCoreRef(ref);
      if (id) ids.push(id);
    }
    page += 1;
  } while (page <= pageCount);

  return [...new Set(ids)];
}

async function fetchCoreAthleteDetails(
  season: number,
  athleteIds: string[],
  pauseMs: number
): Promise<EspnAthlete[]> {
  const out: EspnAthlete[] = [];
  for (let i = 0; i < athleteIds.length; i += 1) {
    const id = athleteIds[i];
    const url = coreAthleteDetailUrl(season, id);
    const r = await fetch(url, { headers: REQUEST_HEADERS });
    if (!r.ok) throw new Error(`ESPN core athlete ${id} ${season}: ${r.status}`);
    const d = (await r.json()) as CoreAthleteDetail;
    out.push(coreDetailToEspnAthlete(d));
    if (pauseMs > 0 && i < athleteIds.length - 1) {
      await new Promise((res) => setTimeout(res, pauseMs));
    }
  }
  return out;
}

/**
 * Prefer site roster JSON (one request). If `athletes[].items` are empty — common for past
 * seasons on `site.api` — load via core API: team athlete list + per-athlete detail.
 *
 * When `season` is omitted (“current” roster), core fallback uses the calendar year
 * (`new Date().getFullYear()`), which matches ESPN’s active season in most cases.
 */
export async function fetchRosterAthletes(
  teamId: string,
  season: number | undefined,
  options?: { coreAthletePauseMs?: number }
): Promise<FetchRosterAthletesResult> {
  const roster = await fetchEspnRosterJson(teamId, season);
  const fromSite = flattenAthletes(roster);
  if (fromSite.length > 0) {
    return { athletes: fromSite, source: "site" };
  }

  const seasonYear = season ?? new Date().getFullYear();
  const pause = options?.coreAthletePauseMs ?? 80;
  const ids = await fetchCoreAthleteIdsForTeam(teamId, seasonYear);
  if (ids.length === 0) {
    return { athletes: [], source: "core" };
  }
  const athletes = await fetchCoreAthleteDetails(seasonYear, ids, pause);
  return { athletes, source: "core" };
}

/** All 32 teams — ESPN `displayName` strings (order matches typical NFL listing). */
export const NFL_TEAM_DISPLAY_NAMES: readonly string[] = [
  "Arizona Cardinals",
  "Atlanta Falcons",
  "Baltimore Ravens",
  "Buffalo Bills",
  "Carolina Panthers",
  "Chicago Bears",
  "Cincinnati Bengals",
  "Cleveland Browns",
  "Dallas Cowboys",
  "Denver Broncos",
  "Detroit Lions",
  "Green Bay Packers",
  "Houston Texans",
  "Indianapolis Colts",
  "Jacksonville Jaguars",
  "Kansas City Chiefs",
  "Las Vegas Raiders",
  "Los Angeles Chargers",
  "Los Angeles Rams",
  "Miami Dolphins",
  "Minnesota Vikings",
  "New England Patriots",
  "New Orleans Saints",
  "New York Giants",
  "New York Jets",
  "Philadelphia Eagles",
  "Pittsburgh Steelers",
  "San Francisco 49ers",
  "Seattle Seahawks",
  "Tampa Bay Buccaneers",
  "Tennessee Titans",
  "Washington Commanders",
];

/** Inclusive NFL season years (ESPN `?season=`). E.g. `2015, 2024` → 2015..2024. */
export function seasonRangeInclusive(start: number, end: number): number[] {
  if (start > end) {
    throw new Error(`seasonRangeInclusive: start (${start}) must be <= end (${end})`);
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
