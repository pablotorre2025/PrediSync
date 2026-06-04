import { useState } from 'react';
import { nanoid } from 'nanoid';
import type { Editor } from '@tiptap/react';
import type { Sermon } from '@/types';
import { TextSelection } from '@tiptap/pm/state';

interface Props {
  sermon: Sermon;
  editor: Editor | null;
  onChange: (anotaciones: NonNullable<Sermon['anotacionesMargen']>) => void;
}

export function MarginNotesPanel({ sermon, editor, onChange }: Props) {
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');

  const notas = sermon.anotacionesMargen ?? [];

  function addFromSelection() {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    if (empty) { alert('Selecciona el texto al que quieres anclar la nota.'); return; }
    const ancla = editor.state.doc.textBetween(from, to, ' ').slice(0, 80);
    const id = nanoid(8);
    editor.chain().focus().setMarginNote(id).run();
    const nueva = { id, ancla, texto: '', createdAt: Date.now() };
    onChange([...notas, nueva]);
    setDraftFor(id);
    setDraftText('');
  }

  function saveDraft(id: string) {
    onChange(notas.map(n => n.id === id ? { ...n, texto: draftText } : n));
    setDraftFor(null);
    setDraftText('');
  }

  function removeNote(id: string) {
    if (editor) {
      const markType = editor.state.schema.marks.marginNote;
      if (markType) {
        let transaction = editor.state.tr;
        let collapsePos: number | null = null;

        editor.state.doc.descendants((node, position) => {
          if (!node.isText) return;
          const hasTargetMark = node.marks.some(mark => mark.type === markType && mark.attrs.noteId === id);
          if (!hasTargetMark) return;
          collapsePos ??= position;
          transaction = transaction.removeMark(position, position + node.nodeSize, markType);
        });

        if (collapsePos !== null) {
          transaction = transaction.setSelection(TextSelection.create(transaction.doc, collapsePos));
          editor.view.dispatch(transaction);
        }
      }
    }
    onChange(notas.filter(n => n.id !== id));
  }

  function focusAnchor(id: string) {
    const el = document.querySelector<HTMLElement>(`.editor-body [data-note-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 1200);
    }
  }

  return (
    <div>
      <button className="ghost-btn" style={{ width: '100%', marginBottom: 8 }} onClick={addFromSelection}>
        ✎ Añadir nota al margen (desde selección)
      </button>
      {notas.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>
          Selecciona texto en el editor y pulsa el botón para anclar una anotación.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notas.map(n => (
            <div key={n.id} className="margin-note">
              <div className="margin-note-anchor-label" onClick={() => focusAnchor(n.id)} title="Ir al ancla">
                “{n.ancla}”
              </div>
              {draftFor === n.id ? (
                <>
                  <textarea
                    autoFocus
                    rows={3}
                    value={draftText}
                    onChange={e => setDraftText(e.target.value)}
                    placeholder="Escribe la anotación…"
                    style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', fontFamily: 'inherit', resize: 'vertical' }}
                  />
                  <div className="row" style={{ marginTop: 4 }}>
                    <button className="primary-btn" onClick={() => saveDraft(n.id)}>Guardar</button>
                    <button className="ghost-btn" onClick={() => { setDraftFor(null); setDraftText(''); }}>Cancelar</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="margin-note-text" onClick={() => { setDraftFor(n.id); setDraftText(n.texto); }}>
                    {n.texto || <em style={{ color: 'var(--text-muted)' }}>Click para editar…</em>}
                  </div>
                  <div className="row" style={{ marginTop: 4 }}>
                    <button className="ghost-btn" onClick={() => { setDraftFor(n.id); setDraftText(n.texto); }}>Editar</button>
                    <button className="ghost-btn" onClick={() => removeNote(n.id)}>Eliminar</button>
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
