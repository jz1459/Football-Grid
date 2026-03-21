"use client";

import Square from "./Square";

type NormalBoardProps = {
  squares: (string | null)[];
  onSquareClick: (index: number) => void;
};

/** 3×3 grid of `Square` components; `onSquareClick` receives flat index `0..8`. */
export default function NormalBoard({ squares, onSquareClick }: NormalBoardProps) {
  return (
    <div className="grid h-[360px] w-[360px] max-w-full grid-cols-3 grid-rows-3 text-center text-2xl text-white">
      {squares.map((square, i) => (
        <Square key={i} value={square} onClick={() => onSquareClick(i)} />
      ))}
    </div>
  );
}
