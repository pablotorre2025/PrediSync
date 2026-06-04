import { create } from 'zustand';
import type { AppUser, AppSettings, SyncStatus, UserId } from './types';
import { DEFAULT_SETTINGS, DEFAULT_USERS } from './constants';
import { getSettings, saveSettings, pullSermonTypes } from './storage/seed';
import { fullSync } from './storage/sermonService';
import { syncBibles } from './storage/bibleSync';

interface AppState {
  user: AppUser | null;
  settings: AppSettings;
  syncStatus: SyncStatus;
  online: boolean;
  setUser: (u: AppUser | null) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  setSyncStatus: (s: SyncStatus) => void;
  setOnline: (b: boolean) => void;
  triggerSync: () => Promise<void>;
}

const USER_KEY = 'smp:lastUserId';

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  settings: { ...DEFAULT_SETTINGS },
  syncStatus: 'local',
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,

  async setUser(u) {
    if (u) {
      localStorage.setItem(USER_KEY, u.id);
      const s = await getSettings(u.id);
      set({ user: u, settings: s });
      document.documentElement.dataset.theme = s.theme;
      // Sincronizar al login
      void get().triggerSync();
    } else {
      localStorage.removeItem(USER_KEY);
      set({ user: null });
    }
  },

  async updateSettings(patch) {
    const { user, settings } = get();
    const next = { ...settings, ...patch };
    set({ settings: next });
    document.documentElement.dataset.theme = next.theme;
    if (user) await saveSettings(user.id, next);
  },

  setSyncStatus: (s) => set({ syncStatus: s }),
  setOnline: (b) => set({ online: b, syncStatus: b ? get().syncStatus : 'offline' }),

  async triggerSync() {
    const { user, online } = get();
    if (!user || !online) {
      set({ syncStatus: online ? 'local' : 'offline' });
      return;
    }
    set({ syncStatus: 'syncing' });
    try {
      await fullSync(user.id);
      await syncBibles(user.id);
      void pullSermonTypes(user.id);
      set({ syncStatus: 'synced' });
    } catch (e) {
      console.error('Sync error:', e);
      set({ syncStatus: 'error' });
    }
  }
}));

export function getRememberedUserId(): UserId | null {
  const id = localStorage.getItem(USER_KEY);
  return DEFAULT_USERS.find(u => u.id === id)?.id ?? null;
}
