"use client";

import { useEffect } from "react";
import { polyfillCountryFlagEmojis } from "country-flag-emoji-polyfill";

/** Windows no dibuja emojis de banderas: carga una fuente solo con banderas
 *  si el sistema no las soporta (en el resto no hace nada). */
export default function FlagPolyfill() {
  useEffect(() => {
    polyfillCountryFlagEmojis();
  }, []);
  return null;
}
