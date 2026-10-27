"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Ventana que entra al historial, como el mapa en pantalla completa: el botón
 * atrás del celular la cierra y no sale de la app. `key` marca la entrada
 * ({ [key]: marca }) para saber si al cerrar hay que volver atrás.
 */
export function useBackClose<T>(key: string): [T | null, (value: T, mark?: string | true) => void, () => void] {
  const [value, setValue] = useState<T | null>(null);

  useEffect(() => {
    const onPop = () => setValue(null);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const open = useCallback(
    (next: T, mark: string | true = true) => {
      window.history.pushState({ [key]: mark }, "");
      setValue(next);
    },
    [key]
  );

  const close = useCallback(() => {
    if (window.history.state?.[key]) window.history.back();
    setValue(null);
  }, [key]);

  return [value, open, close];
}
