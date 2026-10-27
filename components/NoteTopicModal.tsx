"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { TripNoteTopic } from "@/types/Trip";

type Props = {
  topic: TripNoteTopic;
  onClose: () => void;
};

/** Ventana con un tema de Notas. Se cierra con la X, Escape o tocando afuera */
export default function NoteTopicModal({ topic, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Directo en el body, como ExpenseModal: si no, la barra de navegación queda encima
  return createPortal(
    <div
      data-testid="topic-backdrop"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={topic.title}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl bg-surface shadow-2xl sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold">
            <span aria-hidden className="mr-2">
              {topic.emoji}
            </span>
            {topic.title}
          </h2>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface-2">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto overscroll-contain px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {topic.sections.map((section) => (
            <section key={section.title}>
              <h3 className="mb-1.5 font-bold">{section.title}</h3>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-snug">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
