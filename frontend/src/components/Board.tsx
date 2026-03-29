"use client";

import Square from "./Square";

type BoardProps = {
  squares: (string | null)[];
  onSquareClick: (index: number) => void;
  /** Board dimension (3, 4, or 5). */
  size: number;
  /** Square width/height in pixels (same for every cell). */
  cellSize: number;
  /** Flat indices forming the winning line, when the game is won. */
  winningLine?: number[] | null;
};

/** `size×size` grid of `Square` components; `onSquareClick` receives flat index `0 .. size*size-1`. */
export default function Board({ squares, onSquareClick, size, cellSize, winningLine }: BoardProps) {
  const px = size * cellSize;
  const winSet = winningLine && winningLine.length > 0 ? new Set(winningLine) : null;

  return (
    <div
      className="grid max-w-full text-center"
      style={{
        width: px,
        height: px,
        gridTemplateColumns: `repeat(${size}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${size}, ${cellSize}px)`,
      }}
    >
      {squares.map((square, i) => (
        <Square
          key={i}
          value={square}
          cellSize={cellSize}
          isWinning={Boolean(winSet?.has(i))}
          onClick={() => onSquareClick(i)}
        />
      ))}
    </div>
  );
}
