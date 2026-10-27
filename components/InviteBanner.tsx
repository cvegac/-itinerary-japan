"use client";

import { useState } from "react";
import { LogIn, X } from "lucide-react";
import type { SharedNotesApi } from "@/lib/use-shared-notes";

/** Se abrió la app con un link de invitación: entrar para sumarse al viaje */
export default function InviteBanner({ api }: { api: SharedNotesApi }) {
  const [hidden, setHidden] = useState(false);
  const pending = api.invited && api.status === "signed-out";
  if (hidden || (!pending && !api.inviteError)) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-xl lg:bottom-4"
    >
      <div className="min-w-0 flex-1 text-sm">
        {api.inviteError ? (
          <p className="font-semibold text-amber-700">{api.inviteError}</p>
        ) : (
          <>
            <p className="font-semibold">Te invitaron a este viaje</p>
            <p className="text-muted">Entrá con Google para dejar notas y tips en cada día.</p>
            <button
              type="button"
              onClick={api.signIn}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg"
            >
              <LogIn className="size-4" aria-hidden />
              Iniciar sesión con Google
            </button>
          </>
        )}
      </div>
      <button type="button" aria-label="Cerrar aviso" onClick={() => setHidden(true)} className="-m-1 rounded-lg p-1 text-muted hover:bg-surface-2">
        <X className="size-4" />
      </button>
    </div>
  );
}
