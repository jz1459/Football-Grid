import NormalGame from "@/components/NormalGame";

/** Home route: full-viewport shell around the interactive football tic-tac-toe game. */
export default function Home() {
  return (
    <main className="App flex min-h-screen w-full max-w-full flex-row items-center justify-center py-6">
      <NormalGame />
    </main>
  );
}
