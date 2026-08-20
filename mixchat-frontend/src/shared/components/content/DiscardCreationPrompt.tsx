"use client";

import React, { useId } from "react";
import { AlertTriangle } from "lucide-react";

interface DiscardCreationPromptProps {
  isOpen: boolean;
  itemName: string;
  onKeepEditing: () => void;
  onDiscard: () => void;
}

export function DiscardCreationPrompt({
  isOpen,
  itemName,
  onKeepEditing,
  onDiscard,
}: DiscardCreationPromptProps) {
  const titleId = useId();
  const descriptionId = useId();

  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onKeepEditing();
          return;
        }
        if (event.key !== "Tab") return;

        const buttons = Array.from(
          event.currentTarget.querySelectorAll<HTMLButtonElement>("button"),
        );
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (!first || !last) return;

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
        event.stopPropagation();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-sm rounded-[1.75rem] bg-[#151b2b] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:p-6"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-300">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 id={titleId} className="mt-4 text-xl font-extrabold text-white">
          Discard this {itemName}?
        </h2>
        <p id={descriptionId} className="mt-2 text-sm leading-6 text-white/55">
          The media and details you added will be removed from this draft.
        </p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            autoFocus
            onClick={onKeepEditing}
            className="min-h-12 cursor-pointer rounded-2xl bg-white/[0.075] px-4 text-sm font-bold text-white transition-colors hover:bg-white/[0.11] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
          >
            Keep editing
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="min-h-12 cursor-pointer rounded-2xl bg-rose-500/14 px-4 text-sm font-bold text-rose-200 transition-colors hover:bg-rose-500/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}
