/**
 * Builds every winning line for an `n×n` tic-tac-toe board: `n` rows, `n` columns, 2 diagonals.
 * Each line lists flat indices `0 .. n*n-1`.
 */
function winningLinesForSize(n: number): number[][] {
  if (n < 2) return [];

  const lines: number[][] = [];

  for (let r = 0; r < n; r += 1) {
    lines.push(Array.from({ length: n }, (_, c) => r * n + c));
  }

  for (let c = 0; c < n; c += 1) {
    lines.push(Array.from({ length: n }, (_, r) => r * n + c));
  }

  lines.push(Array.from({ length: n }, (_, i) => i * (n + 1)));
  lines.push(Array.from({ length: n }, (_, i) => (i + 1) * (n - 1)));

  return lines;
}

/**
 * Returns `'X' | 'O'` if that player owns a full line on an `n×n` board, else `null`.
 * `squares.length` must be `n * n`.
 */
export function calculateWinner(squares: (string | null)[], n: number): "X" | "O" | null {
  const lines = winningLinesForSize(n);
  for (const line of lines) {
    const v = squares[line[0]!];
    if (!v) continue;
    if (line.every((idx) => squares[idx] === v)) {
      return v as "X" | "O";
    }
  }
  return null;
}
