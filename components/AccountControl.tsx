"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { LoaderCircle, LogIn, LogOut, UserRound, X } from "lucide-react";
import {
  getCloudState,
  prepareSignIn,
  resumeSession,
  signIn,
  signOutUser,
  subscribeCloud,
  type CloudState,
} from "@/lib/cloud";

const SERVER_STATE: CloudState = { status: "disabled", user: null, error: null };

/** Botón de la barra superior + panel para iniciar sesión y sincronizar tareas y gastos */
export default function AccountControl() {
  const cloud = useSyncExternalStore(subscribeCloud, getCloudState, () => SERVER_STATE);
  const [open, setOpen] = useState(false);

  useEffect(() => resumeSession(), []);

  if (cloud.status === "disabled") return null;

  const signedIn = cloud.status === "signed-in" && cloud.user;
  const loading = cloud.status === "loading";

  function toggle() {
    if (!open) prepareSignIn();
    setOpen((o) => !o);
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Cuenta"
        aria-expanded={open}
        onClick={toggle}
        className="flex size-9 items-center justify-center rounded-xl transition-colors hover:bg-surface-2"
      >
        {loading ? (
          <LoaderCircle className="size-5 animate-spin text-muted" aria-hidden />
        ) : signedIn ? (
          <span className="flex size-7 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-fg">
            {(cloud.user!.name ?? cloud.user!.email ?? "?").charAt(0).toUpperCase()}
          </span>
        ) : (
          <UserRound className="size-5 text-muted" aria-hidden />
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Cerrar"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Cuenta"
            className="absolute right-0 top-full z-50 mt-3 w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-line bg-surface p-4 text-left shadow-xl"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-sm font-bold">Cuenta</h2>
              <button
                type="button"
                aria-label="Cerrar panel"
                onClick={() => setOpen(false)}
                className="-m-1 rounded-lg p-1 text-muted hover:bg-surface-2"
              >
                <X className="size-4" />
              </button>
            </div>

            {signedIn ? (
              <>
                <p className="text-sm font-semibold">{cloud.user!.name}</p>
                <p className="text-xs text-muted">{cloud.user!.email}</p>
                <p className="mt-3 text-xs leading-relaxed text-muted">
                  Tus tareas y gastos se sincronizan entre tus dispositivos. Sin conexión se guardan igual y suben cuando
                  vuelve la señal.
                </p>
                <button
                  type="button"
                  onClick={() => signOutUser()}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-line"
                >
                  <LogOut className="size-4" aria-hidden />
                  Cerrar sesión
                </button>
                <p className="mt-2 text-xs text-muted">Al cerrar sesión se borra la copia de la nube en este dispositivo.</p>
              </>
            ) : (
              <>
                <p className="text-xs leading-relaxed text-muted">
                  Iniciá sesión para tener tus tareas y gastos respaldados y en todos tus dispositivos. Sin sesión, todo queda solo en este.
                </p>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => signIn()}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg transition-opacity disabled:opacity-50"
                >
                  <LogIn className="size-4" aria-hidden />
                  Iniciar sesión con Google
                </button>
              </>
            )}
            {cloud.error && <p className="mt-2 text-xs font-semibold text-amber-700">{cloud.error}</p>}
          </div>
        </>
      )}
    </div>
  );
}
