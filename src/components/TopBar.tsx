import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { signOut } from '@/firebase/auth';
import { APP_VERSION } from '@/constants';
import { checkForSWUpdate } from '@/utils/swUpdate';

export function TopBar() {
  const user = useAppStore(s => s.user);
  const syncStatus = useAppStore(s => s.syncStatus);
  const online = useAppStore(s => s.online);
  const setUser = useAppStore(s => s.setUser);
  const triggerSync = useAppStore(s => s.triggerSync);
  const nav = useNavigate();

  const statusLabel: Record<string, string> = {
    local: 'Guardado local',
    syncing: 'Sincronizando…',
    synced: 'Sincronizado',
    offline: 'Sin conexión',
    error: 'Error al sincronizar'
  };
  const effective = online ? syncStatus : 'offline';

  async function logout() {
    await signOut();
    await setUser(null);
    nav('/');
  }

  return (
    <header className="top-bar">
      <Link to="/" className="brand" style={{ color: 'inherit' }}>Sermon Maker Pro</Link>
      <span className={`sync-badge ${effective}`} onClick={() => { void triggerSync(); void checkForSWUpdate(); }} title="Toca para sincronizar" style={{ cursor: 'pointer' }}>
        <span className="dot" />
        {statusLabel[effective]}
      </span>
      <span className="app-version-badge" title="Versión cargada actualmente en este navegador">
        v{APP_VERSION}
      </span>
      <span className="spacer" />
      <Link to="/settings" className="ghost-btn">Ajustes</Link>
      <button className="ghost-btn" onClick={logout}>
        {user?.name} · Salir
      </button>
    </header>
  );
}
