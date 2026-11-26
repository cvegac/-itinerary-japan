"use client";

import { useRef, useState } from "react";

/** Cuánto hay que tirar (ya amortiguado) para que al soltar se recargue */
export const PULL_THRESHOLD = 70;
/** El dedo recorre el doble de lo que baja el aviso, como en el tirar para recargar nativo */
const DAMPING = 0.5;
const MAX_PULL = PULL_THRESHOLD * 1.4;

/**
 * Tirar para recargar a mano, sobre una lista con scroll propio. El nativo está
 * apagado en globals.css (overscroll-behavior: none) porque en Chrome se comía el
 * gesto de bajar la hoja; este solo arranca si la lista ya está arriba de todo.
 */
export function usePullToRefresh(onRefresh: () => void) {
  const [pull, setPull] = useState(0);
  const startY = useRef<number | null>(null);

  const bind = {
    onTouchStart(e: React.TouchEvent<HTMLElement>) {
      startY.current = e.currentTarget.scrollTop <= 0 ? e.touches[0].clientY : null;
    },
    onTouchMove(e: React.TouchEvent<HTMLElement>) {
      if (startY.current === null) return;
      if (e.currentTarget.scrollTop > 0) {
        startY.current = null;
        setPull(0);
        return;
      }
      const dy = (e.touches[0].clientY - startY.current) * DAMPING;
      setPull(Math.min(MAX_PULL, Math.max(0, dy)));
    },
    onTouchEnd() {
      const armed = startY.current !== null && pull >= PULL_THRESHOLD;
      startY.current = null;
      setPull(0);
      if (armed) onRefresh();
    },
    onTouchCancel() {
      startY.current = null;
      setPull(0);
    },
  };

  return { pull, bind };
}

/** Aviso arriba de la lista mientras se tira hacia abajo */
export function PullIndicator({ pull }: { pull: number }) {
  if (pull <= 0) return null;
  const ready = pull >= PULL_THRESHOLD;
  return (
    <div aria-live="polite" className="flex items-end justify-center overflow-hidden text-xs font-medium text-muted" style={{ height: pull }}>
      <span className="pb-2">{ready ? "↻ Soltá para actualizar" : "↓ Tirá para actualizar"}</span>
    </div>
  );
}
