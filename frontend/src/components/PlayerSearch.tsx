"use client";

import { useEffect } from "react";
import Autosuggest, {
  type ChangeEvent,
  type RenderSuggestionParams,
  type SuggestionsFetchRequestedParams,
} from "react-autosuggest";
import type { PlayerSuggestion } from "@/types/player";

type PlayerSearchProps = {
  show: boolean;
  onClose: () => void;
  userInput: string;
  onUserInputChange: (value: string) => void;
  checkPlayer: (squareIndex: number) => void;
  modalData: number;
  suggestions: PlayerSuggestion[];
  onSuggestionsFetchRequested: (params: SuggestionsFetchRequestedParams) => void;
  onSuggestionsClearRequested: () => void;
  getSuggestionValue: (suggestion: PlayerSuggestion) => string;
};

/**
 * Modal overlay with `react-autosuggest` for picking a player; **Search** runs validation on the parent
 * (`checkPlayer` then `onClose`). **Escape** or backdrop click closes without submitting.
 */
export default function PlayerSearch({
  show,
  onClose,
  userInput,
  onUserInputChange,
  checkPlayer,
  modalData,
  suggestions,
  onSuggestionsFetchRequested,
  onSuggestionsClearRequested,
  getSuggestionValue,
}: PlayerSearchProps) {
  /** Registers a window `keydown` listener to close on Escape while the modal is open. */
  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, onClose]);

  if (!show) return null;

  /** Bridges Autosuggest text changes into controlled `userInput` state in the parent. */
  const handleSearch = (_event: React.FormEvent<HTMLElement>, { newValue }: ChangeEvent) => {
    onUserInputChange(newValue);
  };

  /** Submits the current input for the square that opened the modal, then dismisses the dialog. */
  const handleSubmit = () => {
    checkPlayer(modalData);
    onClose();
  };

  const inputProps = {
    placeholder: "Type a player's name",
    value: userInput,
    onChange: handleSearch,
    className:
      "w-full rounded border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500",
  };

  /** One row in the suggestion dropdown; keyboard navigation toggles `isHighlighted` styling. */
  const renderSuggestion = (
    suggestion: PlayerSuggestion,
    { isHighlighted }: RenderSuggestionParams,
  ) => (
    <div
      className={`cursor-pointer border-b border-neutral-200 px-3 py-2 text-neutral-900 last:border-b-0 ${
        isHighlighted ? "bg-sky-100" : "bg-white"
      }`}
    >
      {suggestion.name} ({suggestion.position})
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-lg bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-search-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-neutral-200 px-4 py-3">
          <div className="text-center sm:text-left">
            <h2 id="player-search-title" className="text-xl font-bold text-neutral-900">
              Search Player
            </h2>
            <p className="mt-1 text-sm font-medium text-red-600">
              Eligibility follows your backend seed (e.g. nflverse season range).
            </p>
          </div>
          <button
            type="button"
            className="rounded p-1 text-2xl leading-none text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-4 py-4">
          <div className="autosuggest-container relative w-full">
            <Autosuggest<PlayerSuggestion>
              suggestions={suggestions}
              onSuggestionsFetchRequested={onSuggestionsFetchRequested}
              onSuggestionsClearRequested={onSuggestionsClearRequested}
              getSuggestionValue={getSuggestionValue}
              renderSuggestion={renderSuggestion}
              inputProps={inputProps}
              onSuggestionSelected={(_event, { suggestion }) => {
                onUserInputChange(getSuggestionValue(suggestion));
                onSuggestionsClearRequested();
              }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 bg-neutral-900 px-4 py-3">
          <button
            type="button"
            className="rounded px-4 py-2 text-white hover:text-red-400"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="rounded bg-white px-4 py-2 text-neutral-900 hover:text-green-600"
            onClick={handleSubmit}
          >
            Search
          </button>
        </div>
      </div>
    </div>
  );
}
