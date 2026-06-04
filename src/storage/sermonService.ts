import { nanoid } from 'nanoid';
import { collection, doc, getDocs, setDoc, query, where, Timestamp } from 'firebase/firestore';
import { localDB } from './db';
import { db } from '@/firebase/config';
import { clearVersions } from './versionService';
import type { Sermon, UserId } from '@/types';

const COLLECTION = 'sermons';

export function createEmptySermon(userId: UserId, tipo = 'expositivo'): Sermon {
  const now = Date.now();
  return {
    id: nanoid(),
    userId,
    titulo: 'Sermón sin título',
    pasaje: '',
    tipo,
    tono: 'pastoral y cercano',
    audiencia: 'congregación general',
    velocidad: 130,
    contenidoHTML: '<p></p>',
    tags: [],
    serie: '',
    favorito: false,
    status: 'borrador',
    createdAt: now,
    updatedAt: now,
    localDirty: true
  };
}

export async function listLocalSermons(userId: UserId): Promise<Sermon[]> {
  const sermons = await localDB.sermons
    .where('userId').equals(userId)
    .reverse().sortBy('updatedAt');
  return sermons.filter(s => !s.deletedAt);
}

export async function getLocalSermon(id: string): Promise<Sermon | undefined> {
  const sermon = await localDB.sermons.get(id);
  return sermon?.deletedAt ? undefined : sermon;
}

export async function saveSermonLocal(s: Sermon): Promise<void> {
  s.updatedAt = Date.now();
  s.localDirty = true;
  await localDB.sermons.put(s);
}

export async function deleteSermonLocal(id: string, userId: UserId): Promise<void> {
  const existing = await localDB.sermons.get(id);
  const now = Date.now();
  const tombstone: Sermon = {
    ...(existing ?? createDeletedSermonPlaceholder(id, userId, now)),
    userId,
    updatedAt: now,
    deletedAt: now,
    localDirty: true
  };

  await localDB.sermons.put(tombstone);
  await clearVersions(id);
  try {
    await pushDirtySermons(userId);
  } catch {
    // El tombstone queda localDirty para sincronizarse cuando vuelva la conexión.
  }
}

function createDeletedSermonPlaceholder(id: string, userId: UserId, now: number): Sermon {
  return {
    id,
    userId,
    titulo: 'Sermón eliminado',
    pasaje: '',
    tipo: 'expositivo',
    tono: 'pastoral y cercano',
    audiencia: 'congregación general',
    velocidad: 130,
    contenidoHTML: '<p></p>',
    tags: [],
    serie: '',
    favorito: false,
    status: 'borrador',
    createdAt: now,
    updatedAt: now,
    localDirty: true
  };
}

/** Elimina campos undefined para que Firestore no los rechace. */
function sanitizeForFirestore(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  );
}

/** Sube los sermones marcados como `localDirty` a Firestore. */
export async function pushDirtySermons(userId: UserId): Promise<number> {
  const all = await localDB.sermons.where('userId').equals(userId).toArray();
  const dirty = all.filter(s => s.localDirty === true);
  let count = 0;
  for (const s of dirty) {
    if (!s.localDirty) continue;
    const payload = sanitizeForFirestore({
      ...s,
      localDirty: undefined,    // no guardar flag interno en Firestore
      remoteVersion: (s.remoteVersion ?? 0) + 1,
      _updatedTs: Timestamp.now()
    });
    await setDoc(doc(db, COLLECTION, `${userId}__${s.id}`), payload);
    s.localDirty = false;
    s.syncedAt = Date.now();
    s.remoteVersion = (s.remoteVersion ?? 0) + 1;
    await localDB.sermons.put(s);
    count++;
  }
  return count;
}

/** Trae sermones del usuario desde Firestore y los fusiona con los locales (last-write-wins por updatedAt). */
export async function pullRemoteSermons(userId: UserId): Promise<number> {
  const q = query(collection(db, COLLECTION), where('userId', '==', userId));
  const snap = await getDocs(q);
  let count = 0;
  const remoteIds = new Set<string>();

  for (const d of snap.docs) {
    const remote = d.data() as Sermon;
    remoteIds.add(remote.id);
    const local = await localDB.sermons.get(remote.id);

    if (remote.deletedAt) {
      if (local && (!local.localDirty || (remote.updatedAt ?? remote.deletedAt) >= (local.updatedAt ?? 0))) {
        await localDB.sermons.delete(remote.id);
        await clearVersions(remote.id);
        count++;
      }
      continue;
    }

    if (local?.deletedAt && local.localDirty) continue;

    if (!local || (remote.updatedAt ?? 0) > (local.updatedAt ?? 0)) {
      await localDB.sermons.put({ ...remote, localDirty: false });
      count++;
    }
  }

  const locals = await localDB.sermons.where('userId').equals(userId).toArray();
  for (const local of locals) {
    if (local.deletedAt || local.localDirty) continue;
    if (!local.syncedAt && !local.remoteVersion) continue;
    if (remoteIds.has(local.id)) continue;
    await localDB.sermons.delete(local.id);
    await clearVersions(local.id);
    count++;
  }

  return count;
}

export async function fullSync(userId: UserId): Promise<{ pushed: number; pulled: number }> {
  const pushed = await pushDirtySermons(userId);
  const pulled = await pullRemoteSermons(userId);
  return { pushed, pulled };
}
