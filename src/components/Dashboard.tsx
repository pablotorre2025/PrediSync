import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/storage/db';
import { useAppStore } from '@/store';
import { createEmptySermon, saveSermonLocal, deleteSermonLocal } from '@/storage/sermonService';
import type { Sermon } from '@/types';

type StatusFilter = 'todos' | 'borrador' | 'listo' | 'predicado' | 'archivado' | 'favoritos';

export function Dashboard() {
  const user = useAppStore(s => s.user)!;
  const triggerSync = useAppStore(s => s.triggerSync);
  const nav = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('todos');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'titulo' | 'createdAt'>('updatedAt');

  const sermones = useLiveQuery(
    () => localDB.sermons.where('userId').equals(user.id).toArray(),
    [user.id]
  ) ?? [];

  const visibleSermones = useMemo(() => sermones.filter(s => !s.deletedAt), [sermones]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    visibleSermones.forEach(s => s.tags.forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [visibleSermones]);

  const filtered = useMemo(() => {
    let list = [...visibleSermones];
    if (filter === 'favoritos') list = list.filter(s => s.favorito);
    else if (filter !== 'todos') list = list.filter(s => s.status === filter);
    if (tagFilter) list = list.filter(s => s.tags.includes(tagFilter));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(s =>
        s.titulo.toLowerCase().includes(q) ||
        (s.pasaje?.toLowerCase().includes(q)) ||
        s.contenidoHTML.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (sortBy === 'titulo') return a.titulo.localeCompare(b.titulo);
      if (sortBy === 'createdAt') return b.createdAt - a.createdAt;
      return b.updatedAt - a.updatedAt;
    });
    return list;
  }, [visibleSermones, filter, tagFilter, query, sortBy]);

  async function newSermon() {
    const s = createEmptySermon(user.id);
    await saveSermonLocal(s);
    void triggerSync();
    nav(`/sermon/${s.id}`);
  }

  async function duplicate(s: Sermon, e: React.MouseEvent) {
    e.stopPropagation();
    const copy: Sermon = { ...s, id: crypto.randomUUID(), titulo: `${s.titulo} (copia)`, createdAt: Date.now(), updatedAt: Date.now(), localDirty: true, syncedAt: undefined, remoteVersion: 0 };
    await saveSermonLocal(copy);
    void triggerSync();
  }

  async function toggleFav(s: Sermon, e: React.MouseEvent) {
    e.stopPropagation();
    await saveSermonLocal({ ...s, favorito: !s.favorito });
  }

  async function remove(s: Sermon, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`¿Eliminar "${s.titulo}"?`)) return;
    await deleteSermonLocal(s.id, user.id);
    void triggerSync();
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Mis sermones</h2>
        <input
          className="search-input"
          placeholder="Buscar sermones…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button className="ghost-btn" onClick={() => nav('/biblia')}>📖 Visor de Biblia</button>
        <button className="primary-btn" onClick={newSermon}>+ Nuevo sermón</button>
      </div>

      <div className="row" style={{ marginBottom: 18, gap: 8 }}>
        {(['todos', 'borrador', 'listo', 'predicado', 'archivado', 'favoritos'] as const).map(f => (
          <button key={f} className={`ghost-btn ${filter === f ? 'primary-btn' : ''}`} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
        {allTags.length > 0 && (
          <select className="tb-select" value={tagFilter} onChange={e => setTagFilter(e.target.value)}>
            <option value="">Todas las etiquetas</option>
            {allTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <select className="tb-select" value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
          <option value="updatedAt">Recientes</option>
          <option value="createdAt">Más antiguos</option>
          <option value="titulo">Título A-Z</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>No hay sermones todavía.</p>
          <button className="primary-btn" onClick={newSermon}>Crear el primero</button>
        </div>
      ) : (
        <div className="sermon-grid">
          {filtered.map(s => (
            <div key={s.id} className="sermon-card" onClick={() => nav(`/sermon/${s.id}`)}>
              <div className="title">{s.titulo || 'Sin título'}</div>
              {s.pasaje && <div className="meta">{s.pasaje}</div>}
              <div className="meta">
                {new Date(s.updatedAt).toLocaleDateString()} · {s.tipo}
                {s.localDirty && <span style={{ color: 'var(--gold)' }}> · sin sincronizar</span>}
              </div>
              <div className="tags">
                <span className="tag">{s.status}</span>
                {s.tags.slice(0, 3).map(t => <span key={t} className="tag">{t}</span>)}
              </div>
              <div className="row" style={{ gap: 6, marginTop: 8 }}>
                <button className="ghost-btn" onClick={(e) => toggleFav(s, e)}>{s.favorito ? '★' : '☆'}</button>
                <button className="ghost-btn" onClick={(e) => { e.stopPropagation(); nav(`/predicar/${s.id}`); }}>Predicar</button>
                <button className="ghost-btn" onClick={(e) => duplicate(s, e)}>Duplicar</button>
                <button className="ghost-btn" onClick={(e) => remove(s, e)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
