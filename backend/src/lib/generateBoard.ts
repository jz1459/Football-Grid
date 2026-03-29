import { prisma } from "../db";
import { pairKey, persistValidPairsFromDb, readValidPairSetFromFile } from "./generateValidPairs";

export { pairKey, buildValidPairSet, persistValidPairsFromDb } from "./generateValidPairs";

let cached: Set<string> | null = null;

/** Promise to build the valid team-pair set from `data/valid-pairs.json` (regenerated after `db:load_data`). */
let building: Promise<Set<string>> | null = null;

/**
 * Grabs the valid team-pair set from `data/valid-pairs.json` (regenerated after `db:load_data`) and caches it in memory.
 */
export async function getValidPairSet(): Promise<Set<string>> {
  if (cached) return cached;

  // If the valid team-pair set is not currently being built, build it, otherwise return the promise to build it to prevent duplicate builds
  if (!building) {
    building = (async () => {
      const fromFile = readValidPairSetFromFile();
      if (!fromFile || fromFile.size === 0) {
        throw new Error(
          "Missing or empty backend/data/valid-pairs.json. Run `npm run db:load_data` in backend/ to regenerate.",
        );
      }
      return fromFile;
    })()
      .then((s) => {
        cached = s;
        building = null;
        return s;
      })
      .catch((e) => {
        building = null;
        throw e;
      });
  }
  return building;
}

export function invalidateValidPairCache(): void {
  cached = null;
}

/** Rebuild from DB, rewrite JSON, refresh memory cache. */
export async function refreshValidPairsFromDatabase(): Promise<Set<string>> {
  invalidateValidPairCache();
  const set = await persistValidPairsFromDb(prisma);
  cached = set;
  return set;
}

/** Checks if the board is fully valid by checking if every cell has at least one player who played for both teams. */
export function isBoardFullyValid(
  validPairs: Set<string>,
  triviaRow: string[],
  triviaColumn: string[],
  n: number,
): boolean {
  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) {
      const top = triviaRow[col];
      const left = triviaColumn[row];
      if (!top || !left) return false;
      if (!validPairs.has(pairKey(top, left))) return false;
    }
  }
  return true;
}

/** Shuffles an array in place by swapping elements randomly. */
function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

const MAX_RANDOM_ATTEMPTS = 5;

/**
 * Random disjoint column headers (length `n`) and row headers (length `n`) from `pool` such that every
 * grid intersection has at least one player who played for both teams. Returns `null` if no layout found.
 */
export function createBoard(
  validPairs: Set<string>,
  pool: string[],
  n: number,
): { triviaRow: string[]; triviaColumn: string[] } | null {
  if (pool.length < 2 * n) return null;

  for (let attempt = 0; attempt < MAX_RANDOM_ATTEMPTS; attempt += 1) {
    const shuffled = [...pool];
    shuffleInPlace(shuffled);
    const picked = shuffled.slice(0, 2 * n);
    const triviaRow = picked.slice(0, n);
    const triviaColumn = picked.slice(n, 2 * n);
    if (isBoardFullyValid(validPairs, triviaRow, triviaColumn, n)) {
      return { triviaRow, triviaColumn };
    }
  }
  return null;
}
