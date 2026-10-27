"use client";

import { useState } from "react";
import { Check, Copy, LogIn, Share2, Users } from "lucide-react";
import type { SharedNotesApi } from "@/lib/use-shared-notes";

/** Sumar a otra persona para que deje notas en cada día, con un link para una sola */
export default function TripSharing({ api }: { api: SharedNotesApi }) {
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  if (api.status === "disabled" || api.status === "loading") return null;

  const others = (api.trip?.members ?? []).filter((uid) => uid !== api.me).map((uid) => api.names[uid] ?? "alguien");
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // Sin permiso para el portapapeles: queda el texto para copiarlo a mano
    }
  }

  return (
    <section aria-label="Viaje compartido" className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
      <h3 className="flex items-center gap-1.5 font-bold">
        <Users className="size-4 text-muted" aria-hidden />
        Viaje compartido
      </h3>

      {api.status === "signed-out" ? (
        <>
          <p className="text-sm text-muted">Entrá con Google para invitar a alguien a dejar notas y tips en cada día.</p>
          <button
            type="button"
            onClick={api.signIn}
            className="inline-flex items-center gap-1.5 self-start rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg"
          >
            <LogIn className="size-4" aria-hidden />
            Iniciar sesión con Google
          </button>
        </>
      ) : others.length > 0 ? (
        <p className="text-sm">
          Compartido con {others.join(" y ")}: los dos ven y dejan notas en cada día.
        </p>
      ) : link ? (
        <>
          <p className="text-sm text-muted">
            Mandale este link. Sirve para una sola persona: cuando entra con su Google, el viaje queda cerrado.
          </p>
          <input
            readOnly
            aria-label="Link de invitación"
            value={link}
            onFocus={(e) => e.target.select()}
            className="w-full rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-sm"
          />
          <div className="flex gap-2">
            <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-semibold hover:bg-line">
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? "Copiado" : "Copiar"}
            </button>
            {canShare && (
              <button
                type="button"
                onClick={() => navigator.share({ title: "Nuestro viaje", text: "Sumate a las notas del viaje", url: link }).catch(() => {})}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg"
              >
                <Share2 className="size-4" aria-hidden />
                Compartir
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">Invitá a quien viaja con vos: deja notas y tips en cada día y en cada lugar, y vos las ves al toque.</p>
          <button
            type="button"
            onClick={() => setLink(api.invite())}
            className="inline-flex items-center gap-1.5 self-start rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg"
          >
            <Users className="size-4" aria-hidden />
            Invitar a alguien
          </button>
        </>
      )}
    </section>
  );
}
