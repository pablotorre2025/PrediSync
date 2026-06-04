import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/storage/db';
import { nanoid } from 'nanoid';
import type { SmartLabel } from '@/types';

export function LabelSettings() {
  const labels = useLiveQuery(() => localDB.smartLabels.orderBy('orden').toArray(), []) ?? [];
  const [editing, setEditing] = useState<SmartLabel | null>(null);

  async function nuevo() {
    setEditing({
      id: `custom-${nanoid(6)}`,
      nombre: 'Nueva etiqueta',
      color: '#6b7280',
      builtin: false,
      orden: (labels.at(-1)?.orden ?? 0) + 1
    });
  }
  async function save(l: SmartLabel) { await localDB.smartLabels.put(l); setEditing(null); }
  async function remove(l: SmartLabel) {
    if (l.builtin) { alert('Las etiquetas predeterminadas no se pueden eliminar.'); return; }
    if (confirm(`¿Eliminar "${l.nombre}"?`)) await localDB.smartLabels.delete(l.id);
  }
  async function move(l: SmartLabel, dir: -1 | 1) {
    const sorted = [...labels].sort((a, b) => a.orden - b.orden);
    const idx = sorted.findIndex(x => x.id === l.id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    await localDB.smartLabels.put({ ...l, orden: swap.orden });
    await localDB.smartLabels.put({ ...swap, orden: l.orden });
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 14 }}>
        <button className="primary-btn" onClick={nuevo}>+ Nueva etiqueta</button>
      </div>
      {labels.map(l => (
        <div key={l.id} className="list-item">
          <span style={{ background: l.color, width: 18, height: 18, borderRadius: 5 }} />
          <div className="info">
            <div className="name">{l.nombre} {l.builtin && <span className="pill">Predeterminada</span>}</div>
            <div className="desc">{l.color}</div>
          </div>
          <button className="ghost-btn" onClick={() => move(l, -1)}>↑</button>
          <button className="ghost-btn" onClick={() => move(l, 1)}>↓</button>
          <button className="ghost-btn" onClick={() => setEditing(l)}>Editar</button>
          {!l.builtin && <button className="ghost-btn" onClick={() => remove(l)}>Eliminar</button>}
        </div>
      ))}
      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Editar etiqueta</h3>
            <div className="field"><label>Nombre</label><input value={editing.nombre} onChange={e => setEditing({ ...editing, nombre: e.target.value })} /></div>
            <div className="field"><label>Color</label><input type="color" value={editing.color} onChange={e => setEditing({ ...editing, color: e.target.value })} /></div>
            <div className="modal-actions">
              <button className="ghost-btn" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="primary-btn" onClick={() => save(editing)}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
