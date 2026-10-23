"use client";

import { useRef, useState } from "react";
import { nearestSnap, type Snap } from "@/lib/trip-time";

type Props = {
  snap: Snap;
  heights: Record<Snap, number>;
  /** Distancia desde el borde inferior (la barra de navegación) */
  bottomOffset: number;
  onSnapChange: (snap: Snap) => void;
  /** Parte fija de arriba: se arrastra para subir o bajar la hoja */
  header: React.ReactNode;
  children: React.ReactNode;
};

/** Hoja deslizable desde abajo con tres alturas, como en Google Maps */
export default function BottomSheet({ snap, heights, bottomOffset, onSnapChange, header, children }: Props) {
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const drag = useRef<{ startY: number; startHeight: number; moved: boolean } | null>(null);

  const height = dragHeight ?? heights[snap];
  const clamp = (h: number) => Math.min(heights.full, Math.max(heights.peek - 40, h));

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { startY: e.clientY, startHeight: heights[snap], moved: false };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dy = d.startY - e.clientY;
    if (!d.moved && Math.abs(dy) < 6) return;
    if (!d.moved) (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    d.moved = true;
    setDragHeight(clamp(d.startHeight + dy));
  }

  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    if (d?.moved && dragHeight !== null) onSnapChange(nearestSnap(dragHeight, heights));
    setDragHeight(null);
  }

  return (
    <section
      aria-label="Detalle del día"
      className={`absolute inset-x-0 z-20 flex flex-col rounded-t-3xl border-t border-line bg-surface shadow-[0_-8px_30px_rgb(0_0_0/0.12)] ${
        dragHeight === null ? "transition-[height] duration-300 ease-out" : ""
      }`}
      style={{ height, bottom: bottomOffset }}
    >
      <div
        className="shrink-0 cursor-grab touch-pan-x select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <button
          type="button"
          aria-label={snap === "peek" ? "Mostrar más" : "Mostrar menos"}
          onClick={() => onSnapChange(snap === "peek" ? "half" : "peek")}
          className="flex w-full justify-center pt-2.5 pb-1.5"
        >
          <span className="h-1.5 w-10 rounded-full bg-line" />
        </button>
        {header}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3">{children}</div>
    </section>
  );
}
