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
  checkPlayer: (squareIndex: number) => Promise<boolean>;
  modalData: number;
  suggestions: PlayerSuggestion[];
  onSuggestionsFetchRequested: (params: SuggestionsFetchRequestedParams) => void;
  onSuggestionsClearRequested: () => void;
  getSuggestionValue: (suggestion: PlayerSuggestion) => string;
  /** From `GET /config` when API is reachable; otherwise a generic fallback is shown. */
  eligibilityLine?: string | null;
};

/**
 * Modal overlay with `react-autosuggest` for picking a player; **Search** runs validation on the parent
 * (`checkPlayer` then `onClose` on success). **Escape** or backdrop click closes without submitting.
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
  eligibilityLine,
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

  /** Submits the current input for the square that opened the modal; closes only when validation succeeds. */
  const handleSubmit = async () => {
    const ok = await checkPlayer(modalData);
    if (ok) onClose();
  };

  const inputProps = {
    placeholder: "Type a player's name",
    value: userInput,
    onChange: handleSearch,
    className:
      "w-full rounded-lg border border-border bg-elevated px-3 py-2.5 text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40",
  };

  /** One row in the suggestion dropdown; keyboard navigation toggles `isHighlighted` styling. */
  const renderSuggestion = (
    suggestion: PlayerSuggestion,
    { isHighlighted }: RenderSuggestionParams,
  ) => (
    <div
      className={`cursor-pointer border-b border-border px-3 py-2 text-foreground last:border-b-0 ${
        isHighlighted ? "bg-accent/20" : "bg-transparent"
      }`}
    >
      {suggestion.name} ({suggestion.position})
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-visible rounded-xl border border-border bg-background shadow-2xl shadow-black/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-search-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between overflow-hidden rounded-t-xl border-b border-border bg-elevated px-4 py-3">
          <div className="text-center sm:text-left">
            <h2 id="player-search-title" className="text-xl font-bold text-foreground">
              Search Player
            </h2>
            <p className="mt-1 text-sm text-foreground-muted">
              {eligibilityLine ??
                "Eligibility follows your backend nflverse roster data (edit config/game.json on the server)."}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-2xl leading-none text-foreground-muted transition hover:bg-background hover:text-foreground"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="relative z-10 px-4 py-4">
          <div className="autosuggest-container relative z-10 w-full">
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

        <div className="relative z-0 flex justify-end gap-2 overflow-hidden rounded-b-xl border-t border-border bg-elevated px-4 py-3">
          <button
            type="button"
            className="rounded-lg px-4 py-2 font-medium text-foreground-muted transition hover:bg-background hover:text-foreground"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="rounded-lg bg-accent px-4 py-2 font-semibold text-background shadow-sm transition hover:bg-accent-muted"
            onClick={() => void handleSubmit()}
          >
            Search
          </button>
        </div>
      </div>
    </div>
  );
}
