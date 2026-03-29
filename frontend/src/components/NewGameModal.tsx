"use client";

import { useEffect } from "react";

export type GridSize = 3 | 4 | 5;

const GRID_OPTIONS: GridSize[] = [3, 4, 5];

/** Interface for the new game draft. */
export type NewGameDraft = {
  gridSize: GridSize;
  vsComputer: boolean;
  userPlaysFirst: boolean;
};

/** Interface for the props of the new game modal. */
type NewGameModalProps = {
  open: boolean;
  onClose: () => void;
  draft: NewGameDraft;
  onDraftChange: (next: NewGameDraft) => void;
  onConfirm: () => void;
  loading: boolean;
};

/**
 * Overlay to pick grid size, vs computer, and move order before fetching a random board.
 */
export default function NewGameModal({
  open,
  onClose,
  draft,
  onDraftChange,
  onConfirm,
  loading,
}: NewGameModalProps) {
  useEffect(() => {
    if (!open) return;
    // Add an event listener for the escape key to close the modal
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const set = (partial: Partial<NewGameDraft>) => onDraftChange({ ...draft, ...partial });

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-background shadow-2xl shadow-black/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-game-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border bg-elevated px-4 py-3">
          <div>
            <h2 id="new-game-title" className="text-xl font-bold text-foreground">
              New Game
            </h2>
            <p className="mt-1 text-sm text-foreground-muted">Choose size and mode, then start.</p>
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

        <div className="space-y-5 px-4 py-4">
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Grid Size</p>
            <div className="flex flex-wrap gap-2">
              {GRID_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`rounded-lg border px-3 py-1.5 font-semibold transition-colors ${
                    draft.gridSize === n
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border text-foreground-muted hover:border-foreground-muted hover:text-foreground"
                  }`}
                  onClick={() => set({ gridSize: n })}
                >
                  {n}×{n}
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 font-medium text-foreground">
            <input
              type="checkbox"
              className="size-4 rounded border-border accent-accent"
              checked={draft.vsComputer}
              onChange={(e) => set({ vsComputer: e.target.checked })}
            />
            Play vs Computer
          </label>

          {draft.vsComputer && (
            <fieldset className="space-y-2 border-0 p-0 font-medium text-foreground">
              <legend className="mb-1 text-sm text-foreground-muted">You Play</legend>
              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="new-game-move-order"
                    className="size-4 border-border accent-accent"
                    checked={draft.userPlaysFirst}
                    onChange={() => set({ userPlaysFirst: true })}
                  />
                  First (X)
                </label>
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="new-game-move-order"
                    className="size-4 border-border accent-accent"
                    checked={!draft.userPlaysFirst}
                    onChange={() => set({ userPlaysFirst: false })}
                  />
                  Second (O)
                </label>
              </div>
            </fieldset>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border bg-elevated px-4 py-3">
          <button
            type="button"
            className="rounded-lg px-4 py-2 font-medium text-foreground-muted transition hover:bg-background hover:text-foreground"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-accent px-4 py-2 font-semibold text-background shadow-sm transition hover:bg-accent-muted disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void onConfirm()}
            disabled={loading}
          >
            {loading ? "Loading…" : "Start"}
          </button>
        </div>
      </div>
    </div>
  );
}
