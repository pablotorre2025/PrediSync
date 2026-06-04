import React, { useEffect, lazy, Suspense, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useAppStore } from './store';
import { DEFAULT_USERS } from './constants';
import { getRememberedUserId } from './store';
import { auth } from './firebase/config';
import { signOut } from './firebase/auth';
import { seedLocalDB } from './storage/seed';
import { LoginScreen } from './components/LoginScreen';
import { Dashboard } from './components/Dashboard';
import { TopBar } from './components/TopBar';
import { UpdatePrompt } from './components/UpdatePrompt';

const EditorPage = lazy(() => import('./components/editor/EditorPage').then(m => ({ default: m.EditorPage })));
const PredicationMode = lazy(() => import('./components/PredicationMode').then(m => ({ default: m.PredicationMode })));
const SettingsPage = lazy(() => import('./components/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const BibleViewer = lazy(() => import('./components/BibleViewer').then(m => ({ default: m.BibleViewer })));

export default function App() {
  const user = useAppStore(s => s.user);
  const setUser = useAppStore(s => s.setUser);
  const setOnline = useAppStore(s => s.setOnline);
  const triggerSync = useAppStore(s => s.triggerSync);
  const [bootReady, setBootReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      await seedLocalDB();

      const rememberedId = getRememberedUserId();
      if (!cancelled && !user && rememberedId) {
        const rememberedUser = DEFAULT_USERS.find(candidate => candidate.id === rememberedId);
        const firebaseUser = await waitForFirebaseUser();
        if (rememberedUser && firebaseUserMatchesAppUser(firebaseUser, rememberedId)) {
          await setUser({ id: rememberedUser.id, name: rememberedUser.name, email: rememberedUser.email });
        } else {
          await signOut();
          await setUser(null);
        }
      }

      if (!cancelled) setBootReady(true);
    }

    void bootstrap();
    return () => { cancelled = true; };
  }, [setUser, user]);

  useEffect(() => {
    const on = () => { setOnline(true); void triggerSync(); };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, [setOnline, triggerSync]);

  if (!bootReady) return <div className="dashboard"><p>Cargando…</p></div>;

  if (!user) return (
    <>
      <LoginScreen />
      <UpdatePrompt />
    </>
  );

  return (
    <>
      <Shell />
      <UpdatePrompt />
    </>
  );
}

function Shell() {
  return (
    <div className="app-shell">
      <TopBar />
      <ChunkErrorBoundary>
        <Suspense fallback={<div className="dashboard"><p>Cargando…</p></div>}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sermon/:id" element={<EditorPage />} />
            <Route path="/predicar/:id" element={<PredicationMode />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/biblia" element={<BibleViewer />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ChunkErrorBoundary>
    </div>
  );
}

type ChunkErrorBoundaryState = {
  hasError: boolean;
};

class ChunkErrorBoundary extends React.Component<React.PropsWithChildren, ChunkErrorBoundaryState> {
  state: ChunkErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (isChunkLoadError(error)) {
      window.location.reload();
    }
    console.error('Chunk load error:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="dashboard">
        <h2>No se pudo cargar la pantalla</h2>
        <p>La aplicación detectó una versión antigua en caché. Recarga para continuar.</p>
        <button className="primary-btn" onClick={() => window.location.reload()}>Recargar</button>
      </div>
    );
  }
}

function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|Load failed|Failed to fetch/i.test(message);
}

function waitForFirebaseUser(): Promise<User | null> {
  return new Promise(resolve => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      unsubscribe();
      resolve(user);
    });
  });
}

function firebaseUserMatchesAppUser(firebaseUser: User | null, userId: string): boolean {
  const email = firebaseUser?.email?.toLowerCase() ?? '';
  return email.startsWith(`${userId}@`) || email.startsWith(`${userId}-`);
}
