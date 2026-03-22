"use client";

type SquareProps = {
  value: string | null;
  onClick: () => void;
  /** Pixel edge length (width & height) for the cell. */
  cellSize: number;
  /** Part of the winning row/column/diagonal (only when game has a winner). */
  isWinning?: boolean;
};

/** Single tic-tac-toe cell: shows `X`, `O`, or empty; click is forwarded to the board. */
export default function Square({ value, onClick, cellSize, isWinning }: SquareProps) {
  const fontClass = cellSize < 64 ? "text-lg" : cellSize < 90 ? "text-2xl" : "text-3xl";

  const surface =
    value === "X"
      ? "bg-elevated text-[var(--board-x)] ring-1 ring-[var(--board-x)]/35"
      : value === "O"
        ? "bg-elevated text-[var(--board-o)] ring-1 ring-[var(--board-o)]/35"
        : "bg-[var(--board-empty)] text-transparent hover:bg-[var(--board-hover)]";

  const winningEmphasis =
    isWinning && value === "X"
      ? "relative z-[1] border-[var(--win-line-x-ring)] shadow-[0_0_0_2px_var(--background),0_0_20px_var(--win-line-x-glow)] ring-2 ring-[var(--win-line-x-ring)]"
      : isWinning && value === "O"
        ? "relative z-[1] border-[var(--win-line-o-ring)] shadow-[0_0_0_2px_var(--background),0_0_20px_var(--win-line-o-glow)] ring-2 ring-[var(--win-line-o-ring)]"
        : "";

  return (
    <button
      type="button"
      className={`flex cursor-pointer items-center justify-center border border-border font-extrabold outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${fontClass} ${surface} ${winningEmphasis}`}
      style={{ width: cellSize, height: cellSize, minWidth: cellSize, minHeight: cellSize }}
      onClick={onClick}
    >
      {value}
    </button>
  );
}
