/**
 * NFL roster position abbreviations (nflverse / common NFL usage) → Football Grid buckets.
 */

export const POSITION_ABBREV_TO_GRID: Record<string, string> = {
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

/**
 * Inclusive NFL season years for seed loops. E.g. `2015, 2024` → `[2015, …, 2024]`.
 * Throws if `start > end`.
 */
export function seasonRangeInclusive(start: number, end: number): number[] {
  if (start > end) {
    throw new Error(`seasonRangeInclusive: start (${start}) must be <= end (${end})`);
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
