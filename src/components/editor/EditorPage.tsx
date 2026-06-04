import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { nanoid } from 'nanoid';
import { localDB } from '@/storage/db';
import { useAppStore } from '@/store';
import { saveSermonLocal, getLocalSermon } from '@/storage/sermonService';
import { useSermonEditor } from '@/editor/useSermonEditor';
import { EditorBody, EditorToolbar } from './EditorToolbar';
import { LabelsSidebar } from './LabelsSidebar';
import { AIGenerateModal } from './AIGenerateModal';
import { BibleModal } from './BibleModal';
import { VersionHistoryModal } from './VersionHistoryModal';
import { MarginNotesPanel } from './MarginNotesPanel';
import { PrivateNotesPanel } from './PrivateNotesPanel';
import { maybeAutoSnapshot, createVersion } from '@/storage/versionService';
import { estimateMinutes, formatMinutes, countWordsHTML } from '@/utils/duration';
import { shouldMigrateLegacyPrivateNotes } from '@/utils/sermonNotes';
import { printSermon } from '@/utils/printSermon';
import type { Sermon } from '@/types';

export function EditorPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const user = useAppStore(s => s.user)!;
  const settings = useAppStore(s => s.settings);
  const triggerSync = useAppStore(s => s.triggerSync);
  const setSyncStatus = useAppStore(s => s.setSyncStatus);

  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [showBible, setShowBible] = useState(false);
  const [showProps, setShowProps] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'labels' | 'aside' | null>(null);
  const [bibleInsertTarget, setBibleInsertTarget] = useState<'editor' | 'passage'>('editor');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSermonRef = useRef<Sermon | null>(null);
  const latestHTMLRef = useRef<string | null>(null);
  const isSyncingRef = useRef(false);
  const passageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!id) return;
    void getLocalSermon(id).then(s => {
      if (!s) { nav('/'); return; }
      if (s.userId !== user.id) { nav('/'); return; }
      setSermon(s);
    });
  }, [id, user.id, nav]);

  const editor = useSermonEditor(sermon?.contenidoHTML ?? '<p></p>', (html) => {
    if (!isSyncingRef.current) {
      latestHTMLRef.current = html;
      scheduleSave({ contenidoHTML: html });
    }
  });

  // Mantener referencia al sermón más reciente para el flush al desmontar
  useEffect(() => { latestSermonRef.current = sermon; }, [sermon]);

  async function flushPendingChanges() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }

    const current = latestSermonRef.current ?? sermon;
    if (!current) return;

    const html = editor?.getHTML?.() ?? latestHTMLRef.current ?? current.contenidoHTML;
    const toSave = { ...current, contenidoHTML: html, updatedAt: Date.now() };

    latestSermonRef.current = toSave;
    latestHTMLRef.current = html;
    await saveSermonLocal(toSave);
    void maybeAutoSnapshot(toSave);
    void triggerSync();
  }

  // Vaciar edits pendientes al navegar fuera (evita perder el último cambio)
  useEffect(() => {
    return () => {
      void flushPendingChanges();
    };
  }, [editor, sermon]);

  // Sincronizar contenido del editor cuando el sermón se carga
  // Usamos isSyncingRef para evitar que setContent dispare scheduleSave
  useEffect(() => {
    if (editor && sermon) {
      isSyncingRef.current = true;
      editor.commands.setContent(sermon.contenidoHTML || '<p></p>', false);
      isSyncingRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sermon?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 1100px)');
    const handleChange = () => {
      if (!media.matches) setMobilePanel(null);
    };
    handleChange();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!mobilePanel) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobilePanel(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobilePanel]);

  useEffect(() => {
    if (!sermon || !shouldMigrateLegacyPrivateNotes(sermon)) return;
    scheduleSave({
      notasPrivadas: '',
      notasPrivadasItems: [{
        id: nanoid(8),
        texto: sermon.notasPrivadas!.trim(),
        createdAt: Date.now(),
      }],
    });
  }, [sermon]);

  function scheduleSave(patch: Partial<Sermon>) {
    setSermon(prev => prev ? { ...prev, ...patch } : prev);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSermon(current => {
        if (!current) return current;
        void (async () => {
          setSyncStatus('local');
          const merged = { ...current, ...patch };
          await saveSermonLocal(merged);
          void maybeAutoSnapshot(merged);
          void triggerSync();
        })();
        return { ...current, ...patch };
      });
    }, 600);
  }

  function toggleMobilePanel(panel: 'labels' | 'aside') {
    setMobilePanel(current => current === panel ? null : panel);
  }

  function addMarginNoteFromSelection() {
    if (!editor || !sermon) return;
    const { from, to, empty } = editor.state.selection;
    if (empty) {
      alert('Selecciona el texto al que quieres anclar la nota.');
      return;
    }
    const ancla = editor.state.doc.textBetween(from, to, ' ').slice(0, 80);
    const id = nanoid(8);
    editor.chain().focus().setMarginNote(id).run();
    const notas = sermon.anotacionesMargen ?? [];
    scheduleSave({ anotacionesMargen: [...notas, { id, ancla, texto: '', createdAt: Date.now() }] });
    setMobilePanel('aside');
  }

  function openBibleModal() {
    const activeElement = typeof document !== 'undefined' ? document.activeElement : null;
    setBibleInsertTarget(activeElement === passageInputRef.current ? 'passage' : 'editor');
    setShowBible(true);
  }

  function openBibleModalForPassage() {
    setBibleInsertTarget('passage');
    setShowBible(true);
  }

  const stats = useMemo(() => {
    if (!sermon) return { words: 0, minutes: 0 };
    const words = countWordsHTML(sermon.contenidoHTML);
    const minutes = estimateMinutes(sermon.contenidoHTML, sermon.velocidad ?? settings.wordsPerMinute);
    return { words, minutes };
  }, [sermon?.contenidoHTML, sermon?.velocidad, settings.wordsPerMinute]);

  const tipos = useLiveQuery(() => localDB.sermonTypes.filter(t => t.activo).toArray(), []) ?? [];

  if (!sermon) return <div className="dashboard"><p>Cargando…</p></div>;

  return (
    <div className={`editor-layout${mobilePanel === 'labels' ? ' show-labels' : ''}${mobilePanel === 'aside' ? ' show-aside' : ''}`}>
      {mobilePanel && (
        <button
          className="editor-panel-backdrop"
          aria-label="Cerrar panel lateral"
          onClick={() => setMobilePanel(null)}
        />
      )}

      <LabelsSidebar
        editor={editor}
        onClose={mobilePanel === 'labels' ? () => setMobilePanel(null) : undefined}
        onInserted={mobilePanel === 'labels' ? () => setMobilePanel(null) : undefined}
      />

      <div className="editor-main">
        <EditorToolbar editor={editor} />
        <input
          className="editor-title-input"
          value={sermon.titulo}
          placeholder="Título del sermón"
          onChange={e => scheduleSave({ titulo: e.target.value })}
        />
        {!sermon.pasajeTexto && (
          <input
            className="editor-passage-input"
            ref={passageInputRef}
            value={sermon.pasaje ?? ''}
            placeholder="Pasaje (ej. Romanos 12:1-2)"
            onChange={e => scheduleSave({ pasaje: e.target.value, pasajeTexto: '', pasajeVersion: '' })}
          />
        )}
        {sermon.pasajeTexto && (
          <div className="editor-passage-preview">
            <div className="editor-passage-preview-header">
              <div>
                <div className="editor-passage-preview-label">Pasaje base</div>
                <div className="editor-passage-preview-ref">{sermon.pasaje}</div>
              </div>
              <div className="editor-passage-preview-side">
                {sermon.pasajeVersion && <span className="editor-passage-preview-version">{sermon.pasajeVersion}</span>}
                <div className="editor-passage-preview-actions">
                  <button className="ghost-btn" type="button" onClick={openBibleModalForPassage}>Cambiar</button>
                  <button className="ghost-btn" type="button" onClick={() => scheduleSave({ pasaje: '', pasajeTexto: '', pasajeVersion: '' })}>Quitar</button>
                </div>
              </div>
            </div>
            <div className="editor-passage-preview-text">{sermon.pasajeTexto}</div>
          </div>
        )}
        <div className="editor-meta-row">
          <span className="pill">{tipos.find(t => t.id === sermon.tipo)?.nombre ?? sermon.tipo}</span>
          <span className="pill">{stats.words} palabras</span>
          <span className="pill">≈ {formatMinutes(stats.minutes)}</span>
          <button className="ghost-btn editor-panel-toggle" onClick={() => toggleMobilePanel('labels')}>
            {mobilePanel === 'labels' ? 'Cerrar etiquetas' : 'Etiquetas'}
          </button>
          <button className="ghost-btn editor-panel-toggle" onClick={() => toggleMobilePanel('aside')}>
            {mobilePanel === 'aside' ? 'Cerrar inspector' : 'Inspector'}
          </button>
          <button
            className="ghost-btn editor-panel-toggle"
            onMouseDown={e => e.preventDefault()}
            onClick={addMarginNoteFromSelection}
          >
            ✎ Nota al margen
          </button>
          <span className="spacer" />
          <button className="ghost-btn" onClick={() => setShowProps(true)}>Propiedades</button>
          <button className="ghost-btn" onMouseDown={e => e.preventDefault()} onClick={openBibleModal}>📖 Biblia</button>
          <button className="primary-btn" onClick={() => setShowAI(true)}>✨ Generar con IA</button>
          <button className="ghost-btn" onClick={async () => {
            await flushPendingChanges();
            nav(`/predicar/${sermon.id}`);
          }}>Predicar</button>
        </div>
        <EditorBody editor={editor} />
      </div>

      <aside className="editor-aside">
        {mobilePanel === 'aside' && (
          <div className="editor-panel-header">
            <div className="editor-panel-title">Inspector del sermón</div>
            <button className="ghost-btn editor-panel-close" onClick={() => setMobilePanel(null)} aria-label="Cerrar inspector">
              ✕
            </button>
          </div>
        )}
        <div className="duration-card">
          <div className="small">Duración estimada</div>
          <div className="big">{formatMinutes(stats.minutes)}</div>
          <div className="small">{stats.words} palabras · {sermon.velocidad ?? settings.wordsPerMinute} ppm</div>
        </div>

        <h3>Estado</h3>
        <select value={sermon.status} onChange={e => scheduleSave({ status: e.target.value as Sermon['status'] })} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)' }}>
          <option value="borrador">Borrador</option>
          <option value="listo">Listo</option>
          <option value="predicado">Predicado</option>
          <option value="archivado">Archivado</option>
        </select>

        <h3>Velocidad personal (ppm)</h3>
        <input
          type="number"
          min={60} max={250}
          value={sermon.velocidad ?? 130}
          onChange={e => scheduleSave({ velocidad: Number(e.target.value) })}
          style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)' }}
        />

        <h3>Etiquetas</h3>
        <input
          placeholder="Separadas por coma"
          defaultValue={sermon.tags.join(', ')}
          onBlur={e => scheduleSave({ tags: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })}
          style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)' }}
        />

        <h3>Serie</h3>
        <input
          defaultValue={sermon.serie}
          onBlur={e => scheduleSave({ serie: e.target.value })}
          style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)' }}
        />

        <h3>Acciones</h3>
        <button className="ghost-btn" style={{ width: '100%', marginBottom: 6 }} onClick={() => scheduleSave({ favorito: !sermon.favorito })}>
          {sermon.favorito ? '★ Quitar favorito' : '☆ Marcar favorito'}
        </button>
        <button className="ghost-btn" style={{ width: '100%', marginBottom: 6 }} onClick={() => setShowHistory(true)}>🕒 Historial de versiones</button>
        <button className="ghost-btn" style={{ width: '100%', marginBottom: 6 }} onClick={() => exportJSON(sermon)}>Exportar JSON</button>
        <button
          className="ghost-btn"
          style={{ width: '100%' }}
          onClick={() => printSermon({ ...sermon, contenidoHTML: latestHTMLRef.current ?? sermon.contenidoHTML })}
        >
          Imprimir / PDF
        </button>

        <h3>Notas privadas</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 6px' }}>No se muestran en modo predicación.</p>
        <PrivateNotesPanel
          sermon={sermon}
          onChange={(notasPrivadasItems) => scheduleSave({ notasPrivadas: '', notasPrivadasItems })}
        />

        <h3>Anotaciones al margen</h3>
        <MarginNotesPanel
          sermon={sermon}
          editor={editor}
          onChange={(anotaciones) => scheduleSave({ anotacionesMargen: anotaciones })}
        />
      </aside>

      {showAI && (
        <AIGenerateModal
          sermon={sermon}
          onClose={() => setShowAI(false)}
          onApply={(titulo, html) => {
            scheduleSave({ titulo, contenidoHTML: html });
            editor?.commands.setContent(html, false);
          }}
        />
      )}

      {showBible && (
        <BibleModal
          editor={editor}
          defaultBibleId={settings.defaultBibleId}
          insertTarget={bibleInsertTarget}
          onInsertPassageReference={({ reference, text, version }) => scheduleSave({ pasaje: reference, pasajeTexto: text, pasajeVersion: version })}
          onClose={() => setShowBible(false)}
        />
      )}

      {showProps && (
        <PropertiesModal sermon={sermon} tipos={tipos.map(t => ({ id: t.id, nombre: t.nombre }))} onSave={(p) => scheduleSave(p)} onClose={() => setShowProps(false)} />
      )}

      {showHistory && (
        <VersionHistoryModal
          sermon={sermon}
          onClose={() => setShowHistory(false)}
          onRestore={async (v) => {
            await createVersion(sermon, 'antes-de-restaurar');
            scheduleSave({ titulo: v.titulo, contenidoHTML: v.contenidoHTML });
            editor?.commands.setContent(v.contenidoHTML, false);
          }}
        />
      )}
    </div>
  );
}

function PropertiesModal({ sermon, tipos, onSave, onClose }: { sermon: Sermon; tipos: { id: string; nombre: string }[]; onSave: (p: Partial<Sermon>) => void; onClose: () => void; }) {
  const [tipo, setTipo] = useState(sermon.tipo);
  const [tono, setTono] = useState(sermon.tono ?? '');
  const [audiencia, setAudiencia] = useState(sermon.audiencia ?? '');
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Propiedades del sermón</h3>
        <div className="field"><label>Tipo</label>
          <select value={tipo} onChange={e => setTipo(e.target.value)}>
            {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </div>
        <div className="field"><label>Tono</label><input value={tono} onChange={e => setTono(e.target.value)} /></div>
        <div className="field"><label>Audiencia</label><input value={audiencia} onChange={e => setAudiencia(e.target.value)} /></div>
        <div className="modal-actions">
          <button className="ghost-btn" onClick={onClose}>Cancelar</button>
          <button className="primary-btn" onClick={() => { onSave({ tipo, tono, audiencia }); onClose(); }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

function exportJSON(s: Sermon) {
  const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${s.titulo.replace(/\W+/g, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
