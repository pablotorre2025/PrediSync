import { ref, uploadString, deleteObject, listAll, getBytes, type StorageReference } from 'firebase/storage';
import { collection, doc, setDoc, getDocs, deleteDoc, query, where } from 'firebase/firestore';
import { storage, db, firebaseConfig } from '@/firebase/config';
import { localDB } from './db';
import type { BibleData, UserId } from '@/types';

const META_COL = 'bibleMeta';
const DOWNLOAD_TIMEOUT_MS = 45_000;

interface BibleMeta {
  id: string;
  userId: string;
  name: string;
  abbreviation: string;
  lang: string;
  storagePath: string;
}

interface BibleCloudEntry {
  id: string;
  storagePath: string;
  itemRef?: StorageReference;
}

/** Construye la URL pública de descarga directa de Firebase Storage sin SDK auth. */
function storageDownloadUrl(storagePath: string): string {
  const bucket = encodeURIComponent(firebaseConfig.storageBucket);
  const path = encodeURIComponent(storagePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${path}?alt=media`;
}

function bibleIdFromStoragePath(storagePath: string): string {
  const fileName = storagePath.split('/').pop() ?? storagePath;
  return fileName.replace(/\.json$/i, '');
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error && 'code' in error) {
    return String((error as { code?: unknown }).code);
  }
  return String(error ?? 'Error desconocido');
}

async function withDownloadTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await new Promise<T>((resolve, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Tiempo de espera agotado (45 s)')), DOWNLOAD_TIMEOUT_MS);
      promise.then(resolve, reject);
    });
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

async function fetchBibleText(storagePath: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const response = await fetch(storageDownloadUrl(storagePath), {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`);
    }
    return await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado (45 s)');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function downloadBible(entry: BibleCloudEntry): Promise<BibleData> {
  try {
    return JSON.parse(await fetchBibleText(entry.storagePath)) as BibleData;
  } catch (directError) {
    if (!entry.itemRef) throw directError;
    try {
      const bytes = await withDownloadTimeout(getBytes(entry.itemRef));
      return JSON.parse(new TextDecoder().decode(bytes)) as BibleData;
    } catch (sdkError) {
      throw new Error(`URL pública: ${getErrorMessage(directError)}; SDK: ${getErrorMessage(sdkError)}`);
    }
  }
}

async function getCloudBibleEntries(
  userId: UserId,
  onStatus?: (msg: string, done?: number, total?: number) => void
): Promise<BibleCloudEntry[]> {
  const entries = new Map<string, BibleCloudEntry>();
  let storageListSucceeded = false;
  let storageListError: unknown = null;

  try {
    const folderRef = ref(storage, `bibles/${userId}`);
    const { items } = await listAll(folderRef);
    storageListSucceeded = true;
    for (const itemRef of items) {
      const id = bibleIdFromStoragePath(itemRef.fullPath);
      entries.set(id, { id, storagePath: itemRef.fullPath, itemRef });
    }
  } catch (error) {
    storageListError = error;
    onStatus?.(`Storage no respondió: ${getErrorMessage(error)}`, 0, 0);
  }

  try {
    const metaQuery = query(collection(db, META_COL), where('userId', '==', userId));
    const snapshot = await getDocs(metaQuery);
    snapshot.forEach(snapshotDoc => {
      const meta = snapshotDoc.data() as Partial<BibleMeta>;
      if (!meta.storagePath) return;
      const id = meta.id || bibleIdFromStoragePath(meta.storagePath);
      const previous = entries.get(id);
      entries.set(id, { ...previous, id, storagePath: meta.storagePath });
    });
  } catch (error) {
    if (!storageListSucceeded) {
      onStatus?.(`Metadatos no respondieron: ${getErrorMessage(error)}`, 0, 0);
    }
  }

  if (!storageListSucceeded && entries.size === 0 && storageListError) {
    throw new Error(`No se pudieron buscar biblias en la nube: ${getErrorMessage(storageListError)}`);
  }

  return [...entries.values()];
}

/** Sube una Biblia a Firebase Storage y guarda sus metadatos en Firestore. */
export async function uploadBible(bible: BibleData, userId: UserId): Promise<void> {
  const storagePath = `bibles/${userId}/${bible.id}.json`;
  await uploadString(
    ref(storage, storagePath),
    JSON.stringify(bible),
    'raw',
    { contentType: 'application/json' }
  );
  const meta: BibleMeta = {
    id: bible.id,
    userId,
    name: bible.name,
    abbreviation: bible.abbreviation,
    lang: bible.lang,
    storagePath
  };
  // Guardar metadatos en Firestore (best-effort)
  try { await setDoc(doc(db, META_COL, `${userId}__${bible.id}`), meta); } catch { /* no crítico */ }
}

/** Elimina una Biblia de Firebase Storage y de Firestore. */
export async function removeBibleFromCloud(bibleId: string, userId: UserId): Promise<void> {
  try {
    await deleteObject(ref(storage, `bibles/${userId}/${bibleId}.json`));
  } catch { /* puede que no exista */ }
  try {
    await deleteDoc(doc(db, META_COL, `${userId}__${bibleId}`));
  } catch { /* puede que no exista */ }
}

/** Sincroniza Biblias desde Firebase Storage al dispositivo. */
export async function syncBibles(
  userId: UserId,
  onStatus?: (msg: string, done?: number, total?: number) => void
): Promise<void> {
  onStatus?.('Buscando biblias en la nube…', 0, 0);
  const entries = await getCloudBibleEntries(userId, onStatus);
  onStatus?.(`Encontradas ${entries.length} biblias en la nube`, 0, entries.length);
  if (entries.length === 0) return;

  let downloaded = 0;
  let processed = 0;
  for (const entry of entries) {
    const existing = await localDB.bibles.get(entry.id);
    if (existing) {
      processed++;
      onStatus?.(`✓ ${entry.id} ya descargada`, processed, entries.length);
      continue;
    }

    try {
      onStatus?.(`Descargando ${entry.id}… (${processed + 1}/${entries.length})`, processed, entries.length);
      const bible = await downloadBible(entry);
      await localDB.bibles.put(bible);
      downloaded++;
      processed++;
      onStatus?.(`✓ ${entry.id} descargada`, processed, entries.length);
    } catch (e: any) {
      processed++;
      onStatus?.(`✗ Error en ${entry.id}: ${e?.message ?? e}`, processed, entries.length);
    }
  }
  onStatus?.(`Sincronización completa: ${downloaded} descargadas`, processed, entries.length);
}
