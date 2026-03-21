/**
 * Scans all eight tic-tac-toe lines; returns `'X'` or `'O'` if one player owns a full line,
 * otherwise `null`.
 */
export function calculateWinner(squares: (string | null)[]): "X" | "O" | null {
  const lines: [number, number, number][] = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const [a, b, c] of lines) {
    const v = squares[a];
    if (v && v === squares[b] && v === squares[c]) {
      return v as "X" | "O";
    }
  }
  return null;
}
