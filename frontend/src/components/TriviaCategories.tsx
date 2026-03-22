type TriviaCategoriesProps = {
  arr: (string | null)[];
  direction: "row" | "col";
  /** Match board cell size so headers align with the grid. */
  cellSize: number;
};

/** Renders the team-name headers along the top (`row`) or left side (`col`) of the board. */
export default function TriviaCategories({ arr, direction, cellSize }: TriviaCategoriesProps) {
  const isCol = direction === "col";
  const fontClass = cellSize < 64 ? "text-[9px] leading-tight" : cellSize < 90 ? "text-xs" : "text-sm min-[481px]:text-base";

  return (
    <div className={isCol ? "flex flex-col" : "flex flex-row"}>
      {arr.map((team, i) => (
        <div
          key={i}
          className="m-0 flex shrink-0 items-center justify-center rounded-[10px] border-4 border-black bg-neutral-800"
          style={{ width: cellSize, height: cellSize, minWidth: cellSize, minHeight: cellSize }}
        >
          <p className={`px-1 text-center font-medium ${fontClass}`}>{team}</p>
        </div>
      ))}
    </div>
  );
}
