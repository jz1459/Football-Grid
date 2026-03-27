import { calculateWinner, winningLinesForSize } from "@/lib/normalWinner";

export type Mark = "X" | "O";

type Cell = string | null;

function scoreTerminal(
  board: Cell[],
  n: number,
  ply: number,
  aiMark: Mark,
  humanMark: Mark,
): number | null {
  const w = calculateWinner(board, n);
  if (w === aiMark) return 1000 - ply;
  if (w === humanMark) return ply - 1000;
  if (board.every((c) => c !== null)) return 0;
  return null;
}

function evaluatePosition(board: Cell[], n: number, aiMark: Mark, humanMark: Mark): number {
  let score = 0;
  const lines = winningLinesForSize(n);
  for (const line of lines) {
    let ai = 0;
    let hum = 0;
    for (const idx of line) {
      const v = board[idx];
      if (v === aiMark) ai++;
      else if (v === humanMark) hum++;
    }
    if (ai > 0 && hum > 0) continue;
    if (ai > 0) score += 10 ** ai;
    if (hum > 0) score -= 10 ** hum;
  }
  return score;
}

/** Empty cells ordered by distance from board center (better alpha-beta pruning). */
function emptyIndicesOrdered(board: Cell[], n: number): number[] {
  const empty: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) empty.push(i);
  }
  const center = (n * n - 1) / 2;
  empty.sort((a, b) => Math.abs(a - center) - Math.abs(b - center));
  return empty;
}

export function findImmediateWin(board: Cell[], n: number, mark: Mark): number | null {
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== null) continue;
    const next = [...board];
    next[i] = mark;
    if (calculateWinner(next, n) === mark) return i;
  }
  return null;
}

function maxDepthForGrid(n: number): number {
  if (n === 3) return 99;
  if (n === 4) return 6;
  return 5;
}

function minimaxAb(
  board: Cell[],
  n: number,
  ply: number,
  isMaximizing: boolean,
  aiMark: Mark,
  humanMark: Mark,
  alpha: number,
  beta: number,
  maxDepth: number,
): number {
  const term = scoreTerminal(board, n, ply, aiMark, humanMark);
  if (term !== null) return term;

  if (ply >= maxDepth) {
    return evaluatePosition(board, n, aiMark, humanMark);
  }

  const moves = emptyIndicesOrdered(board, n);
  if (moves.length === 0) return 0;

  if (isMaximizing) {
    let value = -Infinity;
    for (const i of moves) {
      const next = [...board];
      next[i] = aiMark;
      value = Math.max(
        value,
        minimaxAb(next, n, ply + 1, false, aiMark, humanMark, alpha, beta, maxDepth),
      );
      alpha = Math.max(alpha, value);
      if (beta <= alpha) break;
    }
    return value;
  }

  let value = Infinity;
  for (const i of moves) {
    const next = [...board];
    next[i] = humanMark;
    value = Math.min(
      value,
      minimaxAb(next, n, ply + 1, true, aiMark, humanMark, alpha, beta, maxDepth),
    );
    beta = Math.min(beta, value);
    if (beta <= alpha) break;
  }
  return value;
}

function bestMoveAb(
  board: Cell[],
  n: number,
  aiMark: Mark,
  humanMark: Mark,
): number {
  const maxDepth = maxDepthForGrid(n);
  let best = -Infinity;
  let move = -1;
  const moves = emptyIndicesOrdered(board, n);
  for (const i of moves) {
    const next = [...board];
    next[i] = aiMark;
    const score = minimaxAb(next, n, 1, false, aiMark, humanMark, -Infinity, Infinity, maxDepth);
    if (score > best) {
      best = score;
      move = i;
    }
  }
  return move;
}

function firstEmpty(board: Cell[]): number {
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) return i;
  }
  return -1;
}

/**
 * Bot plays `botMark`, human `humanMark`. Win/block then minimax with alpha-beta
 * (full depth on 3×3; depth-limited heuristic on larger boards).
 */
export function chooseBotMove(board: Cell[], n: number, botMark: Mark, humanMark: Mark): number {
  const aiMark = botMark;

  const win = findImmediateWin(board, n, aiMark);
  if (win !== null) return win;

  const block = findImmediateWin(board, n, humanMark);
  if (block !== null) return block;

  const m = bestMoveAb(board, n, aiMark, humanMark);
  if (m >= 0) return m;
  return firstEmpty(board);
}
