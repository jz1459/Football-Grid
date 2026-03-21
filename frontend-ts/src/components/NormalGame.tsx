"use client";

import { useCallback, useState } from "react";
import axios from "axios";
import type { SuggestionsFetchRequestedParams } from "react-autosuggest";
import NormalBoard from "./NormalBoard";
import PlayerSearch from "./PlayerSearch";
import TriviaCategories from "./TriviaCategories";
import { calculateWinner } from "@/lib/normalWinner";
import { getApiBase } from "@/lib/api";
import { NFL_TEAMS } from "@/lib/teams";
import type { PlayerSuggestion } from "@/types/player";

/**
 * Main game: random NFL teams label the row/column headers; players take turns claiming a square by
 * naming someone who played for **both** header teams. Uses `search_players` / `get_player` on the API.
 */
export default function NormalGame() {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [newGame, setNewGame] = useState(false);
  const winner = calculateWinner(board);

  const [userInput, setUserInput] = useState("");
  const [modalData, setModalData] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [suggestions, setSuggestions] = useState<PlayerSuggestion[]>([]);

  const [triviaRow, setTriviaRow] = useState<(string | null)[]>(Array(3).fill(null));
  const [triviaColumn, setTriviaColumn] = useState<(string | null)[]>(Array(3).fill(null));

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
    if (!winner && newGame) {
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
    if (winner || boardCopy[i]) return;

    const x = Math.floor(i / 3);
    const y = i - 3 * x;

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
      const rowTeam = triviaRow[y];
      const colTeam = triviaColumn[x];

      if (
        rowTeam &&
        colTeam &&
        values?.includes(rowTeam) &&
        values?.includes(colTeam)
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

  /** Picks six distinct random teams: first three for the top row, last three for the left column. */
  const fillTrivia = () => {
    const usedIndexes: number[] = [];
    const usedRow: string[] = [];
    const usedCol: string[] = [];
    const len = NFL_TEAMS.length;

    while (usedIndexes.length < 6) {
      const index = Math.floor(Math.random() * len);
      if (!usedIndexes.includes(index)) {
        usedIndexes.push(index);
        if (usedIndexes.length < 4) {
          usedRow.push(NFL_TEAMS[index]!);
        } else {
          usedCol.push(NFL_TEAMS[index]!);
        }
      }
    }
    setTriviaRow(usedRow);
    setTriviaColumn(usedCol);
  };

  /** Resets the board, marks the session as started, X moves first, and draws new random headers. */
  const startGame = () => {
    setBoard(Array(9).fill(null));
    setNewGame(true);
    setXIsNext(true);
    fillTrivia();
  };

  return (
    <section id="game" className="game w-full">
      <div className="container mx-auto flex max-w-6xl flex-col items-center px-4">
        <div className="title mb-4 w-full pl-4 text-center min-[481px]:pl-[70px]">
          <h1 className="text-lg font-bold min-[481px]:text-2xl">Football Tic Tac Toe</h1>
        </div>

        <div className="game-content flex flex-row flex-wrap items-start justify-center gap-2 min-[481px]:flex-nowrap">
          <div className="trivia-col-container mr-0 flex flex-col pt-16 min-[481px]:pt-[120px] min-[481px]:-mr-2">
            <TriviaCategories arr={triviaColumn} direction="col" />
          </div>

          <div className="flex flex-col items-center">
            <div className="trivia-row-container mb-0 flex justify-center">
              <TriviaCategories arr={triviaRow} direction="row" />
            </div>
            <div className="board -ml-px">
              <NormalBoard squares={board} onSquareClick={openModal} />
            </div>
          </div>
        </div>

        <div className="message mt-6 text-center">
          <p className="mb-4 text-lg font-bold text-cyan-400 min-[481px]:ml-[150px] min-[481px]:text-2xl">
            {winner ? `Winner: ${winner}` : `Next Player: ${xIsNext ? "X" : "O"}`}
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
