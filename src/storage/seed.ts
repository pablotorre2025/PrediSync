import { localDB } from './db';
import { BUILTIN_SERMON_TYPES, BUILTIN_SMART_LABELS, DEFAULT_SETTINGS } from '@/constants';
import type { UserId, AppSettings, SermonType } from '@/types';
import { db } from '@/firebase/config';
import { doc, getDoc, setDoc, getDocs, deleteDoc, updateDoc, collection, query, where, deleteField } from 'firebase/firestore';

const SETTINGS_BACKUP_PREFIX = 'smp:settings:';
const SETTINGS_COLLECTION = 'settings';

type SettingsSnapshot = {
  data: AppSettings;
  updatedAt: number;
};

function mergeSettings(data?: Partial<AppSettings> | null): AppSettings {
  const merged = { ...DEFAULT_SETTINGS, ...(data ?? {}) };
  // Eliminar rastros de DeepSeek que puedan quedar en Firestore
  delete (merged as any).deepseekApiKey;
  if ((merged as any).aiProvider === 'deepseek') merged.aiProvider = 'claude';
  return merged;
}

function getSettingsBackupKey(userId: UserId): string {
  return `${SETTINGS_BACKUP_PREFIX}${userId}`;
}

function readSettingsBackup(userId: UserId): SettingsSnapshot | null {
  if (typeof localStorage === 'undefined') return null;

  try {
    const raw = localStorage.getItem(getSettingsBackupKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SettingsSnapshot>;
    return {
      data: mergeSettings(parsed.data),
      updatedAt: Number(parsed.updatedAt) || 0
    };
  } catch {
    return null;
  }
}

function writeSettingsBackup(userId: UserId, snapshot: SettingsSnapshot): void {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(getSettingsBackupKey(userId), JSON.stringify(snapshot));
  } catch {
    // Ignore local backup write failures.
  }
}

function createSettingsSnapshot(data?: Partial<AppSettings> | null, updatedAt?: number): SettingsSnapshot {
  return {
    data: mergeSettings(data),
    updatedAt: Number(updatedAt) || 0
  };
}

async function readRemoteSettings(userId: UserId): Promise<SettingsSnapshot | null> {
  try {
    const ref = doc(db, SETTINGS_COLLECTION, userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as { data?: Partial<AppSettings>; updatedAt?: number };
    return createSettingsSnapshot(data.data, data.updatedAt);
  } catch {
    return null;
  }
}

async function writeRemoteSettings(userId: UserId, snapshot: SettingsSnapshot): Promise<void> {
  try {
    const ref = doc(db, SETTINGS_COLLECTION, userId);
    await setDoc(ref, {
      userId,
      data: snapshot.data,
      updatedAt: snapshot.updatedAt
    });
  } catch {
    // Ignore remote sync failures; local persistence still succeeds.
  }
}

function pickNewestSnapshot(...snapshots: Array<SettingsSnapshot | null>): SettingsSnapshot {
  return snapshots
    .filter((snapshot): snapshot is SettingsSnapshot => !!snapshot)
    .sort((left, right) => right.updatedAt - left.updatedAt)[0] ?? createSettingsSnapshot(DEFAULT_SETTINGS, Date.now());
}

/**
 * Garantiza que las semillas (tipos de sermón, smart labels) existan en IndexedDB.
 * Se llama al inicio de la app.
 */
export async function seedLocalDB(): Promise<void> {
  const existingTypes = await localDB.sermonTypes.toArray();
  const existingTypeMap = new Map(existingTypes.map(type => [type.id, type]));

  for (const builtinType of BUILTIN_SERMON_TYPES) {
    const existing = existingTypeMap.get(builtinType.id);
    if (!existing) {
      await localDB.sermonTypes.put(builtinType);
      continue;
    }

    if (!existing.builtin) continue;

    const next = {
      ...existing,
      nombre: builtinType.nombre,
      descripcion: builtinType.descripcion,
      promptOriginal: builtinType.promptOriginal,
      incluirTuHistoria: builtinType.incluirTuHistoria,
      puntosSugeridos: builtinType.puntosSugeridos
    };

    if (!existing.promptOriginal || existing.prompt === existing.promptOriginal) {
      next.prompt = builtinType.prompt;
    }

    await localDB.sermonTypes.put(next);
  }

  const labels = await localDB.smartLabels.count();
  if (labels === 0) {
    await localDB.smartLabels.bulkAdd(BUILTIN_SMART_LABELS);
  }
}

/** Removes DeepSeek fields from Firestore if they still exist (one-time migration). */
async function purgeDeepSeekFromFirestore(userId: UserId): Promise<void> {
  try {
    const ref = doc(db, 'settings', userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as Record<string, unknown>;
    const payload: Record<string, unknown> = {};
    if ('deepSeeekApiKey' in data) payload['deepSeeekApiKey'] = deleteField();
    if ('deepseekApiKey' in data) payload['deepseekApiKey'] = deleteField();
    if (data['aiProvider'] === 'deepseek') payload['aiProvider'] = 'claude';
    // Also check nested data field
    const nested = data['data'] as Record<string, unknown> | undefined;
    if (nested) {
      if ('deepSeeekApiKey' in nested) payload['data.deepSeeekApiKey'] = deleteField();
      if ('deepseekApiKey' in nested) payload['data.deepseekApiKey'] = deleteField();
      if (nested['aiProvider'] === 'deepseek') payload['data.aiProvider'] = 'claude';
    }
    if (Object.keys(payload).length > 0) {
      await updateDoc(ref, payload);
    }
  } catch {
    // Non-critical — silently ignore
  }
}

export async function getSettings(userId: UserId): Promise<AppSettings> {
  const [row, remoteSnapshot] = await Promise.all([
    localDB.settings.get(userId),
    readRemoteSettings(userId)
  ]);

  const localSnapshot = row ? createSettingsSnapshot(row.data, row.updatedAt) : null;
  const backupSnapshot = readSettingsBackup(userId);
  const freshest = pickNewestSnapshot(localSnapshot, backupSnapshot, remoteSnapshot);

  await localDB.settings.put({ userId, data: freshest.data, updatedAt: freshest.updatedAt });
  writeSettingsBackup(userId, freshest);
  void writeRemoteSettings(userId, freshest);
  void purgeDeepSeekFromFirestore(userId);
  return freshest.data;
}

export async function saveSettings(userId: UserId, data: AppSettings): Promise<void> {
  const snapshot = createSettingsSnapshot(data, Date.now());
  await localDB.settings.put({ userId, data: snapshot.data, updatedAt: snapshot.updatedAt });
  writeSettingsBackup(userId, snapshot);
  await writeRemoteSettings(userId, snapshot);
}

// ── Sermon Types Sync ────────────────────────────────────────────────────────
const ST_COLLECTION = 'sermonTypes';

/** Sube un tipo de sermón a Firestore. */
export async function pushSermonType(t: SermonType, userId: UserId): Promise<void> {
  try {
    // Firestore rechaza valores `undefined` — hay que limpiarlos antes de escribir
    const data: Record<string, unknown> = { ...t, userId };
    for (const k of Object.keys(data)) {
      if (data[k] === undefined) delete data[k];
    }
    await setDoc(doc(db, ST_COLLECTION, `${userId}__${t.id}`), data);
  } catch (e) { console.warn('No se pudo subir tipo de sermón:', e); }
}

/** Elimina un tipo de sermón de Firestore. */
export async function deleteSermonTypeRemote(id: string, userId: UserId): Promise<void> {
  try {
    await deleteDoc(doc(db, ST_COLLECTION, `${userId}__${id}`));
  } catch { /* puede que no exista */ }
}

/**
 * Descarga los tipos de sermón del usuario desde Firestore y los fusiona
 * en IndexedDB (last-write-wins: Firestore gana sobre local para typos builtin).
 */
export async function pullSermonTypes(userId: UserId): Promise<void> {
  try {
    const snap = await getDocs(query(collection(db, ST_COLLECTION), where('userId', '==', userId)));
    for (const d of snap.docs) {
      const remote = d.data() as SermonType & { userId: string };
      const { userId: _uid, ...type } = remote;
      await localDB.sermonTypes.put(type);
    }
  } catch (e) { console.warn('No se pudieron sincronizar tipos de sermón:', e); }
}
