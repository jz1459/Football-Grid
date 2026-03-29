"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import type { SuggestionsFetchRequestedParams } from "react-autosuggest";
import Board from "./Board";
import NewGameModal, { type NewGameDraft, type GridSize } from "./NewGameModal";
import PlayerSearch from "./PlayerSearch";
import Categories from "./Categories";
import { calculateWinner, getWinningLine } from "@/lib/winner";
import { chooseBotMove } from "@/lib/botMinimax";
import { getApiBase } from "@/lib/api";
import type { PlayerSuggestion } from "@/types/player";

export type { GridSize };

type Banner = { type: "error" | "info"; message: string };

/**
 * Headers + board form a `(gridSize+1)×(gridSize+1)` cell block (corner implied by padding).
 * Sizes cells from the smaller of width/height budget so the grid fits the viewport.
 */
function computeCellSize(gridSize: number, vw: number, vh: number): number {
  const padX = 64;
  const chromeY = vw < 480 ? 200 : 240;
  const usableW = Math.max(168, vw - padX);
  const usableH = Math.max(168, vh - chromeY);
  const span = gridSize + 1;
  const fromW = Math.floor(usableW / span);
  const fromH = Math.floor(usableH / span);
  const raw = Math.min(fromW, fromH);
  const minPx = 44;
  let maxPx = 120;
  if (vw >= 1536) maxPx = 160;
  else if (vw >= 1024) maxPx = 150;
  else if (vw >= 640) maxPx = 136;
  return Math.max(minPx, Math.min(maxPx, raw));
}

/**
 * Main game: NFL teams label row/column headers (`POST /boards/random` ensures every square has a valid
 * roster answer); turns claim a square by naming someone who played for **both** header teams.
 */
export default function Game() {
  const [gridSize, setGridSize] = useState<GridSize>(3);
  const [boardLoading, setBoardLoading] = useState(false);
  /** Phone-sized default avoids SSR/hydration mismatch and oversized cells before measure. */
  const [viewport, setViewport] = useState({ w: 390, h: 844 });

  useLayoutEffect(() => {
    const measure = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  const cellSize = useMemo(
    () => computeCellSize(gridSize, viewport.w, viewport.h),
    [gridSize, viewport.w, viewport.h],
  );

  const [board, setBoard] = useState<(string | null)[]>(() => Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [newGame, setNewGame] = useState(false);

  // Calculate the winner and the winning line
  const winner = calculateWinner(board, gridSize);
  const winningLine = useMemo(() => getWinningLine(board, gridSize), [board, gridSize]);

  // Check if the board is full
  const boardFull = board.length > 0 && board.every((c) => c !== null);

  // Check if the board is a draw
  const isDraw = boardFull && !winner;

  const [userInput, setUserInput] = useState("");
  const [modalData, setModalData] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [suggestions, setSuggestions] = useState<PlayerSuggestion[]>([]);
  const [banner, setBanner] = useState<Banner | null>(null);

  const [triviaRow, setTriviaRow] = useState<(string | null)[]>(() => Array(3).fill(null));
  const [triviaColumn, setTriviaColumn] = useState<(string | null)[]>(() => Array(3).fill(null));

  /** Vs computer: you may go first (X) or second (O); X always opens the game. */
  const [vsComputer, setVsComputer] = useState(false);
  const [userPlaysFirst, setUserPlaysFirst] = useState(true);
  const [botThinking, setBotThinking] = useState(false);

  const [newGameModalOpen, setNewGameModalOpen] = useState(false);
  const [newGameDraft, setNewGameDraft] = useState<NewGameDraft>({
    gridSize: 3,
    vsComputer: false,
    userPlaysFirst: true,
  });

  const humanMark = userPlaysFirst ? "X" : "O";
  const botMark = userPlaysFirst ? "O" : "X";
  /** Whether the human may move (vs computer) or whose turn in hot-seat. */
  const isHumanTurn = vsComputer ? (userPlaysFirst ? xIsNext : !xIsNext) : true;
  const isBotTurn = vsComputer && (userPlaysFirst ? !xIsNext : xIsNext);

  /** Latest board for the bot effect — avoids depending on `board` so a failed bot move does not re-trigger the effect in a loop. */
  const boardRef = useRef(board);
  boardRef.current = board;

  // Clear the banner after 5 seconds
  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 5000);
    return () => window.clearTimeout(t);
  }, [banner]);

  /** Changing dimensions clears the board and headers until the user starts again. */
  useEffect(() => {
    const n = gridSize;
    // Clear the board and the headers
    setBoard(Array(n * n).fill(null));
    setTriviaRow(Array(n).fill(null));
    setTriviaColumn(Array(n).fill(null));

    // Reset the game
    setNewGame(false);
    setXIsNext(true);
    setShowModal(false);
    setUserInput("");
  }, [gridSize]);

  const api = getApiBase();

  const [eligibilityLine, setEligibilityLine] = useState<string | null>(null);

  // Get the eligibility line from the API (backend config)
  useEffect(() => {
    void axios
      .get<{
        rosterSeasonRange?: { start: number; end: number };
        rosterSeasonYears?: number[] | null;
      }>(`${api}/config`)
      .then(({ data }) => {
        const years = data.rosterSeasonYears?.filter((y) => typeof y === "number") ?? [];
        if (years.length > 0) {
          const sorted = [...new Set(years)].sort((a, b) => a - b);
          const span = `${sorted[0]}–${sorted[sorted.length - 1]}`;
          const detail =
            sorted.length <= 6 ? sorted.join(", ") : `${span} (${sorted.length} seasons)`;
          setEligibilityLine(`Eligibility follows nflverse roster seasons: ${detail}.`);
          return;
        }
        const r = data.rosterSeasonRange;
        if (r && typeof r.start === "number" && typeof r.end === "number") {
          setEligibilityLine(`Eligibility follows nflverse roster seasons ${r.start}–${r.end}.`);
        }
      })
      .catch(() => setEligibilityLine(null));
  }, [api]);

  /** Calls `POST /search_players` and returns suggestion objects for Autosuggest (empty on error). */
  const getSuggestions = useCallback(
    async (value: string): Promise<PlayerSuggestion[]> => {
      const inputValue = value.trim().toLowerCase();
      if (inputValue.length === 0) return [];
      try {
        const response = await axios.post<PlayerSuggestion[]>(`${api}/search_players`, {
          searchTerm: value,
        });
        return response.data;
      } catch (e) {
        console.error("Error fetching search:", e);
        return [];
      }
    },
    [api],
  );

  /** Autosuggest hook: refresh dropdown list from the API for the current input string. */
  const onSuggestionsFetchRequested = async ({ value }: SuggestionsFetchRequestedParams) => {
    setSuggestions(await getSuggestions(value));
  };

  /** Autosuggest hook: clear cached suggestions when the library requests it. */
  const onSuggestionsClearRequested = () => {
    setSuggestions([]);
  };

  /** String placed in the input when a suggestion is chosen — includes position. */
  const getSuggestionValue = (suggestion: PlayerSuggestion) =>
    `${suggestion.name} (${suggestion.position})`;

  /** Opens the player-search modal for square `i` if the game is active and there is no winner yet. */
  const openModal = (i: number) => {
    if (vsComputer && (!isHumanTurn || botThinking)) return;
    if (!winner && !isDraw && newGame) {
      setModalData(i);
      setShowModal(true);
    }
  };

  /**
   * Validates the typed player via `POST /get_player`; if their team list includes both header teams for
   * this square, records `X` or `O` and advances turn. Returns true when the move was recorded.
   */
  const checkPlayer = async (i: number): Promise<boolean> => {
    const boardCopy = [...board];
    if (winner || isDraw || boardCopy[i]) return false;
    if (vsComputer && !isHumanTurn) return false;

    // Get the row and column of the square
    const n = gridSize;
    const row = Math.floor(i / n);
    const col = i - n * row;

    if (userInput.length === 0) return false;

    try {
      const trimmed = userInput.trim();
      
      const paren = trimmed.match(/^(.+?)\s+\((.+)\)\s*$/);
      const playerName = paren ? paren[1].trim() : trimmed;
      const position = paren ? paren[2].trim() : undefined;

      // Get the team names that the player has played for
      const response = await axios.post<string[]>(`${api}/get_player`, {
        playerName,
        ...(position ? { position } : {}),
      });
      const values = response.data;
      const topHeaderTeam = triviaRow[col];
      const leftHeaderTeam = triviaColumn[row];

      // Check if the player has played for both teams
      if (
        topHeaderTeam &&
        leftHeaderTeam &&
        values?.includes(topHeaderTeam) &&
        values?.includes(leftHeaderTeam)
      ) {
        boardCopy[i] = xIsNext ? "X" : "O";
        setBoard(boardCopy);
        setXIsNext(!xIsNext);
        setUserInput("");
        return true;
      }
      // If the player has not played for both teams, show an error banner
      setBanner({
        type: "error",
        message: "Incorrect answer — that player did not play for both teams.",
      });
      setUserInput("");
      return false;
    } catch (e) {
      console.error("Error validating player:", e);
      setBanner({
        type: "error",
        message: "Player not found or error fetching player data.",
      });
      setUserInput("");
      return false;
    }
  };

  /** Applies modal choices, then loads a random solvable board from the API. Returns whether the fetch succeeded. */
  const startGameFromOptions = async (opts: NewGameDraft): Promise<boolean> => {
    setVsComputer(opts.vsComputer);
    setUserPlaysFirst(opts.userPlaysFirst);
    const size = opts.gridSize;
    if (size !== gridSize) {
      setGridSize(size);
    }

    setBoardLoading(true);
    // Load a random solvable board from the API
    try {
      const { data } = await axios.post<{ triviaRow: string[]; triviaColumn: string[] }>(
        `${api}/boards/random`,
        { gridSize: size },
      );
      setTriviaRow(data.triviaRow);
      setTriviaColumn(data.triviaColumn);
      setBoard(Array(size * size).fill(null));
      setNewGame(true);
      setXIsNext(true);
      return true;
    } catch (e) {
      console.error("Error fetching board:", e);
      const msg =
        axios.isAxiosError(e) && e.response?.data && typeof (e.response.data as { error?: string }).error === "string"
          ? (e.response.data as { error: string }).error
          : "Could not start game — is the API running and roster data loaded?";
      setBanner({ type: "error", message: msg });
      return false;
    } finally {
      setBoardLoading(false);
    }
  };

  const openNewGameModal = () => {
    setNewGameDraft({ gridSize, vsComputer, userPlaysFirst });
    setNewGameModalOpen(true);
  };

  const handleConfirmNewGame = async () => {
    const ok = await startGameFromOptions(newGameDraft);
    if (ok) setNewGameModalOpen(false);
  };

  /** Bot turn: board is pre-validated from our generated valid board; pick a move and place the bot mark. */
  useEffect(() => {
    if (!vsComputer || !newGame || winner || isDraw || !isBotTurn) return;

    let cancelled = false;
    void (() => {
      setBotThinking(true);
      try {
        const move = chooseBotMove(boardRef.current, gridSize, botMark, humanMark);
        const row = Math.floor(move / gridSize);
        const col = move - gridSize * row;
        const topHeaderTeam = triviaRow[col];
        const leftHeaderTeam = triviaColumn[row];

        if (!topHeaderTeam || !leftHeaderTeam || move < 0) {
          if (!cancelled) {
            setBanner({ type: "error", message: "Bot could not pick a square." });
          }
          return;
        }

        setBoard((prev) => {
          if (prev[move] !== null) return prev;
          const next = [...prev];
          next[move] = botMark;
          return next;
        });
        setXIsNext((prev) => !prev);
      } finally {
        if (!cancelled) setBotThinking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [vsComputer, newGame, winner, isDraw, isBotTurn, gridSize, botMark, humanMark, triviaRow, triviaColumn]);

  const statusMessage = !newGame
    ? boardLoading
      ? "Loading…"
      : ""
    : winner
      ? `Winner: ${winner}`
      : isDraw
        ? "Draw"
        : vsComputer
          ? isHumanTurn
            ? `Your Turn (${humanMark})`
            : botThinking
              ? "Computer thinking…"
              : `Computer's Turn (${botMark})`
          : `Next Player: ${xIsNext ? "X" : "O"}`;

  return (
    <section id="game" className="game w-full">
      <div className="container mx-auto flex w-full max-w-[min(100%,88rem)] flex-col items-center px-4">
        {banner && (
          <div
            role="alert"
            className={`fixed left-1/2 top-4 z-[100] max-w-[min(100vw-2rem,28rem)] -translate-x-1/2 rounded-lg border px-4 py-3 text-center text-sm font-medium shadow-lg shadow-black/30 ${
              banner.type === "error"
                ? "border-danger/40 bg-danger-surface text-danger"
                : "border-info/40 bg-info-surface text-info"
            }`}
          >
            {banner.message}
          </div>
        )}

        <div className="title mb-6 w-full text-center">
          <h1 className="text-xl font-bold tracking-tight text-foreground min-[481px]:text-3xl">
            Football Tic Tac Toe
          </h1>
        </div>

        <div className="flex w-full max-w-full justify-center overflow-x-auto overflow-y-visible overscroll-x-contain pb-1">
          <div className="inline-flex shrink-0 flex-nowrap items-start gap-0">
            <div className="flex flex-col" style={{ paddingTop: cellSize }}>
              <Categories arr={triviaColumn} direction="col" cellSize={cellSize} gridSize={gridSize} />
            </div>

            <div className="flex flex-col items-center">
              <div className="flex justify-center">
                <Categories arr={triviaRow} direction="row" cellSize={cellSize} gridSize={gridSize} />
              </div>
              <div className="-ml-px">
                <Board
                  squares={board}
                  size={gridSize}
                  cellSize={cellSize}
                  winningLine={winner ? winningLine : null}
                  onSquareClick={openModal}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="message mt-8 w-full text-center">
          {statusMessage ? (
            <p className="mb-4 text-lg font-bold text-accent min-[481px]:text-2xl">{statusMessage}</p>
          ) : null}
          <button
            type="button"
            disabled={boardLoading}
            className="rounded-lg bg-accent px-8 py-3.5 text-lg font-bold text-background shadow-md shadow-black/25 transition hover:bg-accent-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
            onClick={openNewGameModal}
          >
            New Game
          </button>
        </div>

        <NewGameModal
          open={newGameModalOpen}
          onClose={() => setNewGameModalOpen(false)}
          draft={newGameDraft}
          onDraftChange={setNewGameDraft}
          onConfirm={handleConfirmNewGame}
          loading={boardLoading}
        />

        {showModal && (
          <PlayerSearch
            show={showModal}
            onClose={() => setShowModal(false)}
            userInput={userInput}
            onUserInputChange={setUserInput}
            checkPlayer={checkPlayer}
            modalData={modalData}
            suggestions={suggestions}
            onSuggestionsFetchRequested={onSuggestionsFetchRequested}
            onSuggestionsClearRequested={onSuggestionsClearRequested}
            getSuggestionValue={getSuggestionValue}
            eligibilityLine={eligibilityLine}
          />
        )}
      </div>
    </section>
  );
}
