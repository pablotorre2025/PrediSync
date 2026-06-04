import { nanoid } from 'nanoid';
import { localDB } from './db';
import type { Sermon, SermonVersion, UserId } from '@/types';

/** Crea un snapshot del estado actual del sermón. Mantiene los últimos 50 por sermón. */
export async function createVersion(sermon: Sermon, etiqueta?: string): Promise<SermonVersion> {
  const version: SermonVersion = {
    id: nanoid(),
    sermonId: sermon.id,
    userId: sermon.userId,
    titulo: sermon.titulo,
    contenidoHTML: sermon.contenidoHTML,
    createdAt: Date.now(),
    etiqueta
  };
  await localDB.sermonVersions.put(version);

  // Limitar histórico a 50 por sermón
  const all = await localDB.sermonVersions.where('sermonId').equals(sermon.id).reverse().sortBy('createdAt');
  if (all.length > 50) {
    const toDelete = all.slice(50);
    await localDB.sermonVersions.bulkDelete(toDelete.map(v => v.id));
  }
  return version;
}

export async function listVersions(sermonId: string): Promise<SermonVersion[]> {
  return localDB.sermonVersions.where('sermonId').equals(sermonId).reverse().sortBy('createdAt');
}

export async function deleteVersion(id: string): Promise<void> {
  await localDB.sermonVersions.delete(id);
}

/** Borra todas las versiones de un sermón (al eliminar el sermón). */
export async function clearVersions(sermonId: string): Promise<void> {
  const ids = await localDB.sermonVersions.where('sermonId').equals(sermonId).primaryKeys();
  await localDB.sermonVersions.bulkDelete(ids as string[]);
}

/** Auto-snapshot inteligente: crea uno si la última versión es de hace >5 min y hay cambios. */
const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
export async function maybeAutoSnapshot(sermon: Sermon): Promise<boolean> {
  const last = (await localDB.sermonVersions.where('sermonId').equals(sermon.id).reverse().sortBy('createdAt'))[0];
  if (!last) {
    await createVersion(sermon, 'inicial');
    return true;
  }
  if (Date.now() - last.createdAt < SNAPSHOT_INTERVAL_MS) return false;
  if (last.contenidoHTML === sermon.contenidoHTML && last.titulo === sermon.titulo) return false;
  await createVersion(sermon);
  return true;
}
