type GridSize = 3 | 4 | 5;

type TriviaCategoriesProps = {
  arr: (string | null)[];
  direction: "row" | "col";
  /** Match board cell size so headers align with the grid. */
  cellSize: number;
  gridSize: GridSize;
};

/** Renders the team-name headers along the top (`row`) or left side (`col`) of the board. */
export default function TriviaCategories({ arr, direction, cellSize, gridSize }: TriviaCategoriesProps) {
  const isCol = direction === "col";
  const compact = cellSize < 96;
  const borderClass = compact ? "border-2" : "border-[3px]";
  const density = gridSize === 5 ? 0.85 : gridSize === 4 ? 0.92 : 1;
  const maxLabelPx = cellSize < 92 ? 11 : 14;
  const labelSize = Math.max(8, Math.min(maxLabelPx, Math.round(cellSize * 0.14 * density)));

  return (
    <div className={isCol ? "flex flex-col" : "flex flex-row"}>
      {arr.map((team, i) => (
        <div
          key={i}
          className={`m-0 flex min-h-0 shrink-0 items-center justify-center overflow-hidden rounded-lg ${borderClass} border-border bg-elevated shadow-sm shadow-black/20`}
          style={{ width: cellSize, height: cellSize, minWidth: cellSize, minHeight: cellSize }}
        >
          <p
            className="line-clamp-3 max-h-full w-full break-words px-1 py-0.5 text-center font-medium leading-tight text-foreground"
            style={{ fontSize: `${labelSize}px` }}
          >
            {team}
          </p>
        </div>
      ))}
    </div>
  );
}
