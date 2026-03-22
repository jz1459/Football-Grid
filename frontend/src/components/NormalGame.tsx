"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import type { SuggestionsFetchRequestedParams } from "react-autosuggest";
import NormalBoard from "./NormalBoard";
import PlayerSearch from "./PlayerSearch";
import TriviaCategories from "./TriviaCategories";
import { calculateWinner } from "@/lib/normalWinner";
import { getApiBase } from "@/lib/api";
import { NFL_TEAMS } from "@/lib/teams";
import type { PlayerSuggestion } from "@/types/player";

export type GridSize = 3 | 4 | 5;

const GRID_OPTIONS: GridSize[] = [3, 4, 5];

/**
 * Main game: random NFL teams label the row/column headers; players take turns claiming a square by
 * naming someone who played for **both** header teams. Uses `search_players` / `get_player` on the API.
 */
export default function NormalGame() {
  const [gridSize, setGridSize] = useState<GridSize>(3);

  const cellSize = useMemo(
    () => Math.max(44, Math.min(120, Math.floor(360 / gridSize))),
    [gridSize],
  );

  const [board, setBoard] = useState<(string | null)[]>(() => Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [newGame, setNewGame] = useState(false);
  const winner = calculateWinner(board, gridSize);
  const boardFull = board.length > 0 && board.every((c) => c !== null);
  const isDraw = boardFull && !winner;

  const [userInput, setUserInput] = useState("");
  const [modalData, setModalData] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [suggestions, setSuggestions] = useState<PlayerSuggestion[]>([]);

  const [triviaRow, setTriviaRow] = useState<(string | null)[]>(() => Array(3).fill(null));
  const [triviaColumn, setTriviaColumn] = useState<(string | null)[]>(() => Array(3).fill(null));

  /** Changing dimensions clears the board and headers until the user starts again. */
  useEffect(() => {
    const n = gridSize;
    setBoard(Array(n * n).fill(null));
    setTriviaRow(Array(n).fill(null));
    setTriviaColumn(Array(n).fill(null));
    setNewGame(false);
    setXIsNext(true);
    setShowModal(false);
    setUserInput("");
  }, [gridSize]);

  const api = getApiBase();

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

  /** String placed in the input when a suggestion is chosen — includes position for homonym disambiguation. */
  const getSuggestionValue = (suggestion: PlayerSuggestion) =>
    `${suggestion.name} (${suggestion.position})`;

  /** Opens the player-search modal for square `i` if the game is active and there is no winner yet. */
  const openModal = (i: number) => {
    if (!winner && !isDraw && newGame) {
      setModalData(i);
      setShowModal(true);
    }
  };

  /**
   * Validates the typed player via `POST /get_player`; if their team list includes both header teams for
   * this square, records `X` or `O` and advances turn. Parses `Name (Position)` so the API can distinguish homonyms.
   */
  const checkPlayer = async (i: number) => {
    const boardCopy = [...board];
    if (winner || isDraw || boardCopy[i]) return;

    const n = gridSize;
    const row = Math.floor(i / n);
    const col = i - n * row;

    if (userInput.length === 0) return;

    try {
      const trimmed = userInput.trim();
      const paren = trimmed.match(/^(.+?)\s+\((.+)\)\s*$/);
      const playerName = paren ? paren[1].trim() : trimmed;
      const position = paren ? paren[2].trim() : undefined;

      const response = await axios.post<string[]>(`${api}/get_player`, {
        playerName,
        ...(position ? { position } : {}),
      });
      const values = response.data;
      const topHeaderTeam = triviaRow[col];
      const leftHeaderTeam = triviaColumn[row];

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
      } else {
        window.alert("Incorrect Answer!");
        setUserInput("");
      }
    } catch (e) {
      console.error("Error validating player:", e);
      window.alert("Player not found or error fetching player data.");
      setUserInput("");
    }
  };

  /** Picks `2 * gridSize` distinct random teams: first `gridSize` for the top row, next `gridSize` for the left column. */
  const fillTrivia = useCallback(() => {
    const n = gridSize;
    const need = 2 * n;
    const usedIndexes: number[] = [];
    const usedRow: string[] = [];
    const usedCol: string[] = [];
    const len = NFL_TEAMS.length;

    while (usedIndexes.length < need) {
      const index = Math.floor(Math.random() * len);
      if (!usedIndexes.includes(index)) {
        usedIndexes.push(index);
        if (usedIndexes.length <= n) {
          usedRow.push(NFL_TEAMS[index]!);
        } else {
          usedCol.push(NFL_TEAMS[index]!);
        }
      }
    }
    setTriviaRow(usedRow);
    setTriviaColumn(usedCol);
  }, [gridSize]);

  /** Resets the board, marks the session as started, X moves first, and draws new random headers. */
  const startGame = () => {
    setBoard(Array(gridSize * gridSize).fill(null));
    setNewGame(true);
    setXIsNext(true);
    fillTrivia();
  };

  const statusMessage = winner
    ? `Winner: ${winner}`
    : isDraw
      ? "Draw"
      : `Next Player: ${xIsNext ? "X" : "O"}`;

  return (
    <section id="game" className="game w-full">
      <div className="container mx-auto flex max-w-6xl flex-col items-center px-4">
        <div className="title mb-4 w-full pl-4 text-center min-[481px]:pl-[70px]">
          <h1 className="text-lg font-bold min-[481px]:text-2xl">Football Tic Tac Toe</h1>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm text-white/90">
            <span className="font-medium">Grid size</span>
            <div className="flex flex-wrap justify-center gap-2">
              {GRID_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`rounded border px-3 py-1 font-semibold transition-colors ${
                    gridSize === n
                      ? "border-cyan-400 bg-cyan-400/20 text-cyan-300"
                      : "border-white/40 text-white hover:border-white"
                  }`}
                  onClick={() => setGridSize(n)}
                >
                  {n}×{n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="game-content flex flex-row flex-wrap items-start justify-center gap-2 min-[481px]:flex-nowrap">
          <div
            className="trivia-col-container mr-0 flex flex-col min-[481px]:-mr-2"
            style={{ paddingTop: cellSize }}
          >
            <TriviaCategories arr={triviaColumn} direction="col" cellSize={cellSize} />
          </div>

          <div className="flex flex-col items-center">
            <div className="trivia-row-container mb-0 flex justify-center">
              <TriviaCategories arr={triviaRow} direction="row" cellSize={cellSize} />
            </div>
            <div className="board -ml-px">
              <NormalBoard
                squares={board}
                size={gridSize}
                cellSize={cellSize}
                onSquareClick={openModal}
              />
            </div>
          </div>
        </div>

        <div className="message mt-6 text-center">
          <p className="mb-4 text-lg font-bold text-cyan-400 min-[481px]:ml-[150px] min-[481px]:text-2xl">
            {statusMessage}
          </p>
          <button
            type="button"
            className="start-game relative ml-0 overflow-hidden border border-white bg-transparent px-8 py-4 text-xl font-bold text-white transition-colors duration-300 before:absolute before:left-0 before:top-0 before:-z-10 before:h-full before:w-0 before:bg-white before:transition-all before:duration-300 before:content-[''] hover:text-neutral-900 hover:before:w-full min-[481px]:ml-[150px]"
            onClick={startGame}
          >
            {newGame ? "New Game" : "Start Game"}
          </button>
        </div>

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
          />
        )}
      </div>
    </section>
  );
}
