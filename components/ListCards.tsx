"use client";

import { ChevronRight, ListChecks } from "lucide-react";
import type { SharedList } from "@/lib/shared-notes";
import type { SharedNotesApi } from "@/lib/use-shared-notes";
import type { ListTarget } from "@/components/ListModal";

function shortDate(date: string): string {
  return new Date(date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

/** Tarjetas de las listas de los dos: nombre, día y cuánto está tildado */
export default function ListCards({
  api,
  lists,
  onOpen,
  showDay = true,
}: {
  api: SharedNotesApi;
  lists: SharedList[];
  onOpen: (target: ListTarget) => void;
  /** En el detalle del día no hace falta repetir el día */
  showDay?: boolean;
}) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {lists.map((list) => {
        const items = api.items[list.id] ?? [];
        const done = items.filter((i) => i.done).length;
        const complete = items.length > 0 && done === items.length;
        return (
          <li key={list.id}>
            <button
              type="button"
              onClick={() => onOpen({ listId: list.id })}
              className="flex h-full w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition-colors hover:bg-surface-2"
            >
              <ListChecks className={`size-5 shrink-0 ${complete ? "text-emerald-600" : "text-muted"}`} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{list.title}</span>
                <span className="block text-xs text-muted">
                  {showDay && <>{list.day ? shortDate(list.day) : "Sin día"} · </>}
                  {done} de {items.length}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
