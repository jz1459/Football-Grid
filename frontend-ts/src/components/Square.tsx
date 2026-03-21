"use client";

type SquareProps = {
  value: string | null;
  onClick: () => void;
};

/** Single tic-tac-toe cell: shows `X`, `O`, or empty; click is forwarded to the board. */
export default function Square({ value, onClick }: SquareProps) {
  return (
    <button
      type="button"
      className="flex cursor-pointer items-center justify-center border-2 border-black bg-sky-300 text-3xl font-extrabold text-neutral-900 outline-none"
      onClick={onClick}
    >
      {value}
    </button>
  );
}
