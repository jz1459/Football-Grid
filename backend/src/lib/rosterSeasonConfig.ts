/**
 * Roster season range for API + seeding — from `config/game.json` (`rosterSeason`). For explicit year
 * lists use `rosterSeasonYears` in that file (see `load_data.ts`).
 */
import { getGameConfig } from "./gameConfig";

let cachedRange: { start: number; end: number } | null = null;

export function getRosterSeasonRange(): { start: number; end: number } {
  if (cachedRange) return cachedRange;
  const { start, end } = getGameConfig().rosterSeason;
  if (start > end) {
    throw new Error(`Roster season range invalid: start (${start}) > end (${end})`);
  }
  cachedRange = { start, end };
  return cachedRange;
}

/** Inclusive NFL season years from the configured range (ignores `rosterSeasonYears` list — use load_data for that). */
export function rosterSeasonYears(): number[] {
  const { start, end } = getRosterSeasonRange();
  const years: number[] = [];
  for (let y = start; y <= end; y += 1) years.push(y);
  return years;
}

export function rosterSeasonRangeLabel(): string {
  const { start, end } = getRosterSeasonRange();
  return `${start}–${end}`;
}
