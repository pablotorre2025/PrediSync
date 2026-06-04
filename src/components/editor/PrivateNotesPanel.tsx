import { useState } from 'react';
import { nanoid } from 'nanoid';
import type { Sermon } from '@/types';
import { getPrivateNotes } from '@/utils/sermonNotes';

interface Props {
  sermon: Sermon;
  onChange: (notas: NonNullable<Sermon['notasPrivadasItems']>) => void;
}

export function PrivateNotesPanel({ sermon, onChange }: Props) {
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');

  const notas = getPrivateNotes(sermon);

  function startNew() {
    const id = nanoid(8);
    const nueva = { id, texto: '', createdAt: Date.now() };
    onChange([...notas, nueva]);
    setDraftFor(id);
    setDraftText('');
  }

  function startEdit(id: string, texto: string) {
    setDraftFor(id);
    setDraftText(texto);
  }

  function saveDraft(id: string) {
    onChange(notas.map(nota => nota.id === id ? { ...nota, texto: draftText } : nota));
    setDraftFor(null);
    setDraftText('');
  }

  function removeNote(id: string) {
    onChange(notas.filter(nota => nota.id !== id));
    if (draftFor === id) {
      setDraftFor(null);
      setDraftText('');
    }
  }

  return (
    <div>
      <button className="ghost-btn" style={{ width: '100%', marginBottom: 8 }} onClick={startNew}>
        + Añadir nota privada
      </button>
      {notas.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>
          Crea notas privadas individuales para usar tus recordatorios dentro del modo predicación.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notas.map((nota, index) => (
            <div key={nota.id} className="margin-note">
              <div className="margin-note-anchor-label">Nota privada {index + 1}</div>
              {draftFor === nota.id ? (
                <>
                  <textarea
                    autoFocus
                    rows={3}
                    value={draftText}
                    onChange={event => setDraftText(event.target.value)}
                    placeholder="Escribe la nota privada…"
                    style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', fontFamily: 'inherit', resize: 'vertical' }}
                  />
                  <div className="row" style={{ marginTop: 4 }}>
                    <button className="primary-btn" onClick={() => saveDraft(nota.id)}>Guardar</button>
                    <button className="ghost-btn" onClick={() => { setDraftFor(null); setDraftText(''); }}>Cancelar</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="margin-note-text" onClick={() => startEdit(nota.id, nota.texto)}>
                    {nota.texto || <em style={{ color: 'var(--text-muted)' }}>Click para editar…</em>}
                  </div>
                  <div className="row" style={{ marginTop: 4 }}>
                    <button className="ghost-btn" onClick={() => startEdit(nota.id, nota.texto)}>Editar</button>
                    <button className="ghost-btn" onClick={() => removeNote(nota.id)}>Eliminar</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}