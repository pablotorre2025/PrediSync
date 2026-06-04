import { useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/storage/db';
import { importBibleFromJSON, deleteBible } from '@/bible/bibleService';
import { useAppStore } from '@/store';

export function BibleSettings() {
  const bibles = useLiveQuery(() => localDB.bibles.toArray(), []) ?? [];
  const user = useAppStore(s => s.user)!;
  const settings = useAppStore(s => s.settings);
  const update = useAppStore(s => s.updateSettings);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b = await importBibleFromJSON(file, user.id);
      if (!settings.defaultBibleId) await update({ defaultBibleId: b.id });
      alert(`Biblia "${b.name}" cargada y sincronizada (${b.books.length} libros).`);
    } catch (err: any) {
      alert(err?.message ?? 'Error al cargar.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar esta Biblia?')) return;
    await deleteBible(id, user.id);
    if (settings.defaultBibleId === id) await update({ defaultBibleId: undefined });
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 14 }}>
        <input ref={fileRef} type="file" accept="application/json" onChange={onFile} />
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
        Estructura esperada: <code>{`{ name, abbreviation, lang, books: [{ name, chapters: [[{verse, text}, …], …] }] }`}</code>
      </p>
      {bibles.length === 0 && <p>No hay Biblias cargadas.</p>}
      {bibles.map(b => (
        <div key={b.id} className="list-item">
          <div className="info">
            <div className="name">{b.name} <span className="pill">{b.abbreviation}</span></div>
            <div className="desc">{b.books.length} libros · {b.lang}</div>
          </div>
          <label className="ghost-btn" style={{ cursor: 'pointer' }}>
            <input type="radio" name="default-bible" checked={settings.defaultBibleId === b.id} onChange={() => update({ defaultBibleId: b.id })} />
            {' '}Por defecto
          </label>
          <button className="ghost-btn" onClick={() => remove(b.id)}>Eliminar</button>
        </div>
      ))}
    </div>
  );
}
