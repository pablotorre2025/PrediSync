import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getLocalSermon } from '@/storage/sermonService';
import { useAppStore } from '@/store';
import type { Sermon } from '@/types';
import { getPrivateNotes } from '@/utils/sermonNotes';

/**
 * Modo predicación: muestra el contenido completo en una sola página continua y desplazable.
 * Controla tamaño con + / − y sale con Escape.
 */
export function PredicationMode() {
  const { id } = useParams();
  const nav = useNavigate();
  const settings = useAppStore(s => s.settings);
  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [fontSize, setFontSize] = useState(settings.predFontSizePx);
  const [showNotes, setShowNotes] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [notesMode, setNotesMode] = useState<'all' | 'focused'>('all');
  const wakeRef = useRef<any>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    void getLocalSermon(id).then(s => {
      if (!s) { nav('/'); return; }
      setSermon(s);
    });
  }, [id, nav]);

  // Mantener pantalla despierta
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // @ts-ignore
        if (navigator.wakeLock) {
          // @ts-ignore
          const w = await navigator.wakeLock.request('screen');
          if (!cancelled) wakeRef.current = w;
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; try { wakeRef.current?.release?.(); } catch { /* */ } };
  }, []);

  // Teclado: +, -, Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '+' || e.key === '=') setFontSize(f => Math.min(f + 2, 96));
      if (e.key === '-') setFontSize(f => Math.max(f - 2, 14));
      if (e.key === 'Escape') nav(-1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nav]);

  const contentHTML = useMemo(() => {
    if (!sermon) return '';
    return buildContent(sermon.contenidoHTML, settings.ocultarNotasPrivadas);
  }, [sermon, settings.ocultarNotasPrivadas]);

  const marginNotes = sermon?.anotacionesMargen ?? [];
  const privateNotes = getPrivateNotes(sermon);
  const activeMarginNote = marginNotes.find(note => note.id === activeNoteId) ?? null;

  useEffect(() => {
    if (!showNotes) return;
    if (!marginNotes.length) {
      setActiveNoteId(null);
      return;
    }
    if (!activeNoteId || !marginNotes.some(note => note.id === activeNoteId)) {
      setActiveNoteId(marginNotes[0].id);
    }
  }, [showNotes, marginNotes, activeNoteId]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  function focusMarginNote(noteId: string) {
    setActiveNoteId(noteId);
    setNotesMode('focused');
    setShowNotes(true);
    const anchor = document.querySelector<HTMLElement>(`.predication-panel [data-note-id="${noteId}"]`);
    if (!anchor) return;
    anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
    anchor.classList.add('flash');
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => anchor.classList.remove('flash'), 1200);
  }

  function handlePanelClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    const anchor = target?.closest<HTMLElement>('.margin-note-anchor');
    const noteId = anchor?.dataset.noteId;
    if (!noteId) return;
    event.preventDefault();
    focusMarginNote(noteId);
  }

  if (!sermon) return <div className="predication"><div className="predication-panel">Cargando…</div></div>;

  const showingFocusedNote = showNotes && notesMode === 'focused' && activeMarginNote;

  return (
    <div className="predication" style={{
      ['--pred-font' as any]: settings.predFontFamily,
      ['--pred-size' as any]: `${fontSize}px`
    }}>
      <div className="predication-toolbar">
        <button className="ghost-btn" onClick={() => nav(-1)}>← Salir</button>
        <button className="icon-btn" onClick={() => setFontSize(f => Math.max(f - 2, 14))} aria-label="Disminuir tamaño">A−</button>
        <button className="icon-btn" onClick={() => setFontSize(f => Math.min(f + 2, 96))} aria-label="Aumentar tamaño">A+</button>
        <div className="progress">{sermon.titulo}</div>
        <button className="ghost-btn" onClick={() => {
          setNotesMode('all');
          setShowNotes(current => !current || notesMode !== 'all');
        }}>
          {showNotes ? 'Ocultar notas' : 'Notas'}
        </button>
        <span className="pill">{fontSize}px</span>
      </div>

      <div className="predication-panel" onClick={handlePanelClick} dangerouslySetInnerHTML={{ __html: contentHTML }} />

      {showNotes && <button className="predication-notes-backdrop" aria-label="Cerrar notas" onClick={() => {
        setShowNotes(false);
        setNotesMode('all');
      }} />}

      <aside className={`predication-notes${showNotes ? ' open' : ''}`}>
        <div className="predication-notes-header">
          <div>
            <div className="predication-notes-title">Notas para predicar</div>
            <div className="predication-notes-subtitle">
              {showingFocusedNote ? 'Mostrando solo la anotación relacionada con el texto que tocaste.' : 'Apoyos privados y anotaciones ancladas al texto.'}
            </div>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            {showingFocusedNote && (
              <button className="ghost-btn" onClick={() => setNotesMode('all')}>Ver todas</button>
            )}
            <button className="ghost-btn" onClick={() => {
              setShowNotes(false);
              setNotesMode('all');
            }}>Cerrar</button>
          </div>
        </div>

        <div className="predication-notes-body">
          {showingFocusedNote ? (
            <section className="predication-notes-section">
              <h3>Anotación relacionada</h3>
              <div className="predication-note-item active predication-note-item-static">
                <div className="predication-note-anchor">“{activeMarginNote.ancla}”</div>
                <div className="predication-note-text">{activeMarginNote.texto?.trim() || 'Sin texto de apoyo todavía.'}</div>
              </div>
            </section>
          ) : (
            <>
              <section className="predication-notes-section">
                <h3>Notas privadas</h3>
                {settings.ocultarNotasPrivadas ? (
                  <p className="predication-notes-muted">Están ocultas por tu ajuste actual en Configuración general.</p>
                ) : privateNotes.length > 0 ? (
                  <div className="predication-note-list">
                    {privateNotes.map((note, index) => (
                      <div key={note.id} className="predication-note-item predication-private-note-item predication-note-item-static">
                        <div className="predication-note-anchor">Nota privada {index + 1}</div>
                        <div className="predication-note-text">{note.texto}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="predication-notes-muted">No hay notas privadas para este sermón.</p>
                )}
              </section>

              <section className="predication-notes-section">
                <h3>Anotaciones al margen</h3>
                {marginNotes.length === 0 ? (
                  <p className="predication-notes-muted">No hay anotaciones ancladas. Puedes crearlas desde el editor seleccionando texto.</p>
                ) : (
                  <div className="predication-note-list">
                    {marginNotes.map(note => (
                      <button
                        key={note.id}
                        className={`predication-note-item${note.id === activeNoteId ? ' active' : ''}`}
                        onClick={() => focusMarginNote(note.id)}
                      >
                        <div className="predication-note-anchor">“{note.ancla}”</div>
                        <div className="predication-note-text">{note.texto?.trim() || 'Sin texto de apoyo todavía.'}</div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

/**
 * Filtra notas privadas (si hideNotes) y devuelve todo el contenido como una cadena HTML.
 */
function buildContent(html: string, hideNotes: boolean): string {
  if (!html?.trim()) return '<p>(Sermón vacío)</p>';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  let content = '';
  for (const node of Array.from(tmp.childNodes)) {
    if (node.nodeType === 1) {
      const el = node as HTMLElement;
      if (hideNotes && el.classList?.contains('smart-block') && el.dataset.label === 'nota pastoral' && el.dataset.private === 'true') continue;
      content += el.outerHTML;
    } else {
      content += node.textContent ?? '';
    }
  }
  return content.trim() ? content : '<p>(Sermón vacío)</p>';
}
