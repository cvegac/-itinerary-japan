// Uso sin conexión, opcional y apagado por defecto.
// El estado no se guarda en ningún lado: "activado" = hay un service worker
// registrado. Apagado no hay nada instalado ni guardado en el celular.

export const CACHE_PREFIX = "viajes-";

export function isOfflineSupported(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator && typeof caches !== "undefined";
}

export async function isOfflineEnabled(): Promise<boolean> {
  if (!isOfflineSupported()) return false;
  return !!(await navigator.serviceWorker.getRegistration("/"));
}

/** Instala (o actualiza a la última versión publicada) y espera a que quede listo */
export async function enableOffline(): Promise<void> {
  const res = await fetch("/offline-manifest.json", { cache: "no-store" });
  const { version } = (await res.json()) as { version: string };
  // Una URL nueva por versión: el navegador lo toma como actualización y vuelve a guardar todo
  await navigator.serviceWorker.register(`/sw.js?v=${version}`, { scope: "/" });
  await navigator.serviceWorker.ready;
}

/** Desinstala el service worker y borra todo lo que guardó */
export async function disableOffline(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((r) => r.unregister()));
  const names = await caches.keys();
  await Promise.all(names.filter((n) => n.startsWith(CACHE_PREFIX)).map((n) => caches.delete(n)));
}

/** Bytes que ocupa lo guardado por este sitio (aproximado), o null si no se sabe */
export async function storageUsage(): Promise<number | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  const { usage } = await navigator.storage.estimate();
  return usage ?? null;
}
