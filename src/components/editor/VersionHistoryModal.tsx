import { useEffect, useState } from 'react';
import { listVersions, createVersion, deleteVersion } from '@/storage/versionService';
import type { Sermon, SermonVersion } from '@/types';

interface Props {
  sermon: Sermon;
  onClose: () => void;
  onRestore: (v: SermonVersion) => void;
}

export function VersionHistoryModal({ sermon, onClose, onRestore }: Props) {
  const [versions, setVersions] = useState<SermonVersion[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setVersions(await listVersions(sermon.id));
    setLoading(false);
  }
  useEffect(() => { void refresh(); }, [sermon.id]);

  async function saveNow() {
    const etiqueta = prompt('Etiqueta para esta versión (opcional):') ?? undefined;
    await createVersion(sermon, etiqueta || undefined);
    await refresh();
  }

  async function remove(v: SermonVersion) {
    if (!confirm('¿Eliminar esta versión?')) return;
    await deleteVersion(v.id);
    await refresh();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Historial de versiones</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Cada cambio importante se respalda automáticamente. Se conservan las últimas 50.
        </p>
        <div className="row" style={{ marginBottom: 14 }}>
          <button className="primary-btn" onClick={saveNow}>+ Guardar versión ahora</button>
        </div>
        {loading ? <p>Cargando…</p> : (
          versions.length === 0 ? <p>Aún no hay versiones guardadas.</p> :
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {versions.map(v => (
              <div key={v.id} className="list-item">
                <div className="info">
                  <div className="name">
                    {v.etiqueta ? `${v.etiqueta} · ` : ''}
                    {new Date(v.createdAt).toLocaleString()}
                  </div>
                  <div className="desc">{v.titulo} · {v.contenidoHTML.replace(/<[^>]+>/g, '').slice(0, 120)}…</div>
                </div>
                <button className="ghost-btn" onClick={() => { if (confirm('¿Restaurar esta versión? El contenido actual será reemplazado (se hará un snapshot antes).')) { onRestore(v); onClose(); } }}>Restaurar</button>
                <button className="ghost-btn" onClick={() => remove(v)}>Eliminar</button>
              </div>
            ))}
          </div>
        )}
        <div className="modal-actions">
          <button className="ghost-btn" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
