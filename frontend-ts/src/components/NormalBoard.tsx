"use client";

import Square from "./Square";

type NormalBoardProps = {
  squares: (string | null)[];
  onSquareClick: (index: number) => void;
  /** Board dimension (3, 4, or 5). */
  size: number;
  /** Square width/height in pixels (same for every cell). */
  cellSize: number;
};

/** `size×size` grid of `Square` components; `onSquareClick` receives flat index `0 .. size*size-1`. */
export default function NormalBoard({ squares, onSquareClick, size, cellSize }: NormalBoardProps) {
  const px = size * cellSize;

  return (
    <div
      className="grid max-w-full text-center text-white"
      style={{
        width: px,
        height: px,
        gridTemplateColumns: `repeat(${size}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${size}, ${cellSize}px)`,
      }}
    >
      {squares.map((square, i) => (
        <Square key={i} value={square} cellSize={cellSize} onClick={() => onSquareClick(i)} />
      ))}
    </div>
  );
}
