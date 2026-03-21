"use client";

type SquareProps = {
  value: string | null;
  onClick: () => void;
  /** Pixel edge length (width & height) for the cell. */
  cellSize: number;
};

/** Single tic-tac-toe cell: shows `X`, `O`, or empty; click is forwarded to the board. */
export default function Square({ value, onClick, cellSize }: SquareProps) {
  const fontClass = cellSize < 64 ? "text-lg" : cellSize < 90 ? "text-2xl" : "text-3xl";

  return (
    <button
      type="button"
      className={`flex cursor-pointer items-center justify-center border-2 border-black bg-sky-300 ${fontClass} font-extrabold text-neutral-900 outline-none`}
      style={{ width: cellSize, height: cellSize, minWidth: cellSize, minHeight: cellSize }}
      onClick={onClick}
    >
      {value}
    </button>
  );
}
