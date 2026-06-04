/// <reference types="vite-plugin-pwa/react" />
import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { APP_VERSION } from '@/constants';
import { clearAppCachesAndReload, setSWRegistration } from '@/utils/swUpdate';

export function UpdatePrompt() {
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl: string, r: ServiceWorkerRegistration | undefined) {
      if (r) setSWRegistration(r);
      // iOS no revisa el SW en segundo plano — forzamos poll cada 60 s
      setInterval(async () => {
        if (!r || r.installing) return;
        if (!navigator.onLine) return;
        try {
          const resp = await fetch(swUrl, {
            cache: 'no-store',
            headers: { 'cache-control': 'no-cache' },
          });
          if (resp.status === 200) await r.update();
        } catch { /* sin conexión */ }
      }, 60_000);
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function checkRemoteVersion() {
      if (!navigator.onLine) return;
      try {
        const response = await fetch(`/version.txt?ts=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'cache-control': 'no-cache' },
        });
        if (!response.ok) return;
        const nextVersion = (await response.text()).trim();
        if (!cancelled) {
          setRemoteVersion(nextVersion || null);
        }
      } catch {
        // ignorar si está offline o el archivo aún no está disponible
      }
    }

    void checkRemoteVersion();
    const timer = window.setInterval(() => { void checkRemoteVersion(); }, 45_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const hasRemoteMismatch = !!remoteVersion && remoteVersion !== APP_VERSION;

  if (!needRefresh && !hasRemoteMismatch) return null;

  const currentVersionLabel = `v${APP_VERSION}`;
  const nextVersionLabel = remoteVersion ? `v${remoteVersion}` : 'una versión más reciente';

  return (
    <div className="update-prompt" role="alert">
      <span className="update-prompt-text">
        🆕 Nueva versión disponible. Estás en {currentVersionLabel} y ya existe {nextVersionLabel}.
      </span>
      <div className="update-prompt-actions">
        <button
          className="primary-btn update-prompt-btn"
          onClick={() => {
            if (needRefresh) {
              void updateServiceWorker(true);
              return;
            }
            void clearAppCachesAndReload();
          }}
        >
          Actualizar
        </button>
        {hasRemoteMismatch && (
          <button
            className="ghost-btn update-prompt-btn"
            onClick={() => { void clearAppCachesAndReload(); }}
          >
            Limpieza total
          </button>
        )}
        <button
          className="ghost-btn update-prompt-dismiss"
          onClick={() => setNeedRefresh(false)}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
