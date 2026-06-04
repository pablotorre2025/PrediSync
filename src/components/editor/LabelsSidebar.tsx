import type { Editor } from '@tiptap/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/storage/db';

interface Props {
  editor: Editor | null;
  onClose?: () => void;
  onInserted?: () => void;
}

export function LabelsSidebar({ editor, onClose, onInserted }: Props) {
  const labels = useLiveQuery(() => localDB.smartLabels.orderBy('orden').toArray(), []) ?? [];

  function insert(labelId: string) {
    if (!editor) return;
    editor.chain().focus().insertSmartBlock(labelId).run();
    onInserted?.();
  }

  return (
    <aside className="editor-sidebar">
      {onClose && (
        <div className="editor-panel-header">
          <div className="editor-panel-title">Smart Labels</div>
          <button className="ghost-btn editor-panel-close" onClick={onClose} aria-label="Cerrar panel de etiquetas">
            ✕
          </button>
        </div>
      )}
      <h3>Smart Labels</h3>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 10px' }}>
        Toca una etiqueta para insertar un bloque estructural.
      </p>
      {labels.map(l => (
        <button key={l.id} className="label-btn" onClick={() => insert(l.id)}>
          <span className="swatch" style={{ background: l.color }} />
          <span>{l.nombre}</span>
        </button>
      ))}
    </aside>
  );
}
