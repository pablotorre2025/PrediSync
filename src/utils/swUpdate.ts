/** Referencia al ServiceWorkerRegistration activo, guardada por UpdatePrompt. */
let _reg: ServiceWorkerRegistration | undefined;

export function setSWRegistration(r: ServiceWorkerRegistration) {
  _reg = r;
}

/** Pide al SW que busque actualizaciones. Silencia errores (offline, etc.). */
export async function checkForSWUpdate(): Promise<void> {
  if (!_reg || !navigator.onLine) return;
  try {
    await _reg.update();
  } catch { /* sin conexión o SW no disponible */ }
}

export async function clearAppCachesAndReload(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));
    }

    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }
  } catch {
    // Si algo falla, igual forzamos recarga para intentar salir del estado viejo.
  }

  const url = new URL(window.location.href);
  url.searchParams.set('refresh', String(Date.now()));
  window.location.replace(url.toString());
}
