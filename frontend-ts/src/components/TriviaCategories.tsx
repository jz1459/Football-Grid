type TriviaCategoriesProps = {
  arr: (string | null)[];
  direction: "row" | "col";
};

/** Renders the team-name headers along the top (`row`) or left side (`col`) of the board. */
export default function TriviaCategories({ arr, direction }: TriviaCategoriesProps) {
  const isCol = direction === "col";
  return (
    <div className={isCol ? "flex flex-col" : "flex flex-row"}>
      {arr.map((team, i) => (
        <div
          key={i}
          className="m-0 flex h-[100px] w-[100px] min-[481px]:h-[120px] min-[481px]:w-[120px] items-center justify-center rounded-[10px] border-4 border-black bg-neutral-800"
        >
          <p className="px-1 text-center text-[10px] font-medium min-[481px]:text-base">{team}</p>
        </div>
      ))}
    </div>
  );
}
