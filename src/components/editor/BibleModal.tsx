import { useEffect, useMemo, useState } from 'react';
import { listBibles, getPassage, searchText, getBible } from '@/bible/bibleService';
import type { BibleData } from '@/types';
import type { Editor } from '@tiptap/react';
import { buildBibleCitationSmartBlock } from '@/editor/bibleCitationContent';

const CANONICAL_BOOKS = [
  { name: 'Génesis', abbr: 'Gn', testament: 'Antiguo Testamento' },
  { name: 'Éxodo', abbr: 'Ex', testament: 'Antiguo Testamento' },
  { name: 'Levítico', abbr: 'Lv', testament: 'Antiguo Testamento' },
  { name: 'Números', abbr: 'Nm', testament: 'Antiguo Testamento' },
  { name: 'Deuteronomio', abbr: 'Dt', testament: 'Antiguo Testamento' },
  { name: 'Josué', abbr: 'Jos', testament: 'Antiguo Testamento' },
  { name: 'Jueces', abbr: 'Jue', testament: 'Antiguo Testamento' },
  { name: 'Rut', abbr: 'Rut', testament: 'Antiguo Testamento' },
  { name: '1 Samuel', abbr: '1 S', testament: 'Antiguo Testamento' },
  { name: '2 Samuel', abbr: '2 S', testament: 'Antiguo Testamento' },
  { name: '1 Reyes', abbr: '1 R', testament: 'Antiguo Testamento' },
  { name: '2 Reyes', abbr: '2 R', testament: 'Antiguo Testamento' },
  { name: '1 Crónicas', abbr: '1 Cr', testament: 'Antiguo Testamento' },
  { name: '2 Crónicas', abbr: '2 Cr', testament: 'Antiguo Testamento' },
  { name: 'Esdras', abbr: 'Esd', testament: 'Antiguo Testamento' },
  { name: 'Nehemías', abbr: 'Neh', testament: 'Antiguo Testamento' },
  { name: 'Ester', abbr: 'Est', testament: 'Antiguo Testamento' },
  { name: 'Job', abbr: 'Job', testament: 'Antiguo Testamento' },
  { name: 'Salmos', abbr: 'Sal', testament: 'Antiguo Testamento' },
  { name: 'Proverbios', abbr: 'Pr', testament: 'Antiguo Testamento' },
  { name: 'Eclesiastés', abbr: 'Ec', testament: 'Antiguo Testamento' },
  { name: 'Cantares', abbr: 'Cnt', testament: 'Antiguo Testamento' },
  { name: 'Isaías', abbr: 'Is', testament: 'Antiguo Testamento' },
  { name: 'Jeremías', abbr: 'Jer', testament: 'Antiguo Testamento' },
  { name: 'Lamentaciones', abbr: 'Lam', testament: 'Antiguo Testamento' },
  { name: 'Ezequiel', abbr: 'Ez', testament: 'Antiguo Testamento' },
  { name: 'Daniel', abbr: 'Dn', testament: 'Antiguo Testamento' },
  { name: 'Oseas', abbr: 'Os', testament: 'Antiguo Testamento' },
  { name: 'Joel', abbr: 'Jl', testament: 'Antiguo Testamento' },
  { name: 'Amós', abbr: 'Am', testament: 'Antiguo Testamento' },
  { name: 'Abdías', abbr: 'Abd', testament: 'Antiguo Testamento' },
  { name: 'Jonás', abbr: 'Jon', testament: 'Antiguo Testamento' },
  { name: 'Miqueas', abbr: 'Miq', testament: 'Antiguo Testamento' },
  { name: 'Nahúm', abbr: 'Nah', testament: 'Antiguo Testamento' },
  { name: 'Habacuc', abbr: 'Hab', testament: 'Antiguo Testamento' },
  { name: 'Sofonías', abbr: 'Sof', testament: 'Antiguo Testamento' },
  { name: 'Hageo', abbr: 'Hag', testament: 'Antiguo Testamento' },
  { name: 'Zacarías', abbr: 'Zac', testament: 'Antiguo Testamento' },
  { name: 'Malaquías', abbr: 'Mal', testament: 'Antiguo Testamento' },
  { name: 'Mateo', abbr: 'Mt', testament: 'Nuevo Testamento' },
  { name: 'Marcos', abbr: 'Mr', testament: 'Nuevo Testamento' },
  { name: 'Lucas', abbr: 'Lc', testament: 'Nuevo Testamento' },
  { name: 'Juan', abbr: 'Jn', testament: 'Nuevo Testamento' },
  { name: 'Hechos', abbr: 'Hch', testament: 'Nuevo Testamento' },
  { name: 'Romanos', abbr: 'Ro', testament: 'Nuevo Testamento' },
  { name: '1 Corintios', abbr: '1 Co', testament: 'Nuevo Testamento' },
  { name: '2 Corintios', abbr: '2 Co', testament: 'Nuevo Testamento' },
  { name: 'Gálatas', abbr: 'Ga', testament: 'Nuevo Testamento' },
  { name: 'Efesios', abbr: 'Ef', testament: 'Nuevo Testamento' },
  { name: 'Filipenses', abbr: 'Flp', testament: 'Nuevo Testamento' },
  { name: 'Colosenses', abbr: 'Col', testament: 'Nuevo Testamento' },
  { name: '1 Tesalonicenses', abbr: '1 Ts', testament: 'Nuevo Testamento' },
  { name: '2 Tesalonicenses', abbr: '2 Ts', testament: 'Nuevo Testamento' },
  { name: '1 Timoteo', abbr: '1 Ti', testament: 'Nuevo Testamento' },
  { name: '2 Timoteo', abbr: '2 Ti', testament: 'Nuevo Testamento' },
  { name: 'Tito', abbr: 'Tit', testament: 'Nuevo Testamento' },
  { name: 'Filemón', abbr: 'Flm', testament: 'Nuevo Testamento' },
  { name: 'Hebreos', abbr: 'Heb', testament: 'Nuevo Testamento' },
  { name: 'Santiago', abbr: 'Stg', testament: 'Nuevo Testamento' },
  { name: '1 Pedro', abbr: '1 P', testament: 'Nuevo Testamento' },
  { name: '2 Pedro', abbr: '2 P', testament: 'Nuevo Testamento' },
  { name: '1 Juan', abbr: '1 Jn', testament: 'Nuevo Testamento' },
  { name: '2 Juan', abbr: '2 Jn', testament: 'Nuevo Testamento' },
  { name: '3 Juan', abbr: '3 Jn', testament: 'Nuevo Testamento' },
  { name: 'Judas', abbr: 'Jud', testament: 'Nuevo Testamento' },
  { name: 'Apocalipsis', abbr: 'Ap', testament: 'Nuevo Testamento' },
] as const;

type PickerType = 'book' | 'chapter' | 'verseStart' | 'verseEnd';

function getPickerMeta(type: PickerType, book: string, chapter: string) {
  switch (type) {
    case 'book':
      return {
        eyebrow: 'Ventana flotante',
        title: 'Libros de la Biblia',
        copy: 'Selecciona el libro desde tarjetas grandes, separadas por Antiguo y Nuevo Testamento.',
      };
    case 'chapter':
      return {
        eyebrow: 'Ventana flotante',
        title: `Capítulos de ${book}`,
        copy: 'Toca un cuadro para elegir el capítulo del libro seleccionado.',
      };
    case 'verseStart':
      return {
        eyebrow: 'Ventana flotante',
        title: `Versículos de ${book} ${chapter}`,
        copy: 'Elige el versículo inicial desde una cuadrícula táctil.',
      };
    case 'verseEnd':
      return {
        eyebrow: 'Ventana flotante',
        title: `Hasta versículo en ${book} ${chapter}`,
        copy: 'Define el rango final o deja un solo versículo.',
      };
  }
}

function normalizeBookName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getBookMeta(name: string) {
  const normalized = normalizeBookName(name);
  const canonical = CANONICAL_BOOKS.find(entry => normalizeBookName(entry.name) === normalized);
  return {
    abbr: canonical?.abbr || name.slice(0, 4),
    testament: canonical?.testament || 'Antiguo Testamento',
    order: canonical ? CANONICAL_BOOKS.indexOf(canonical) : Number.MAX_SAFE_INTEGER,
  };
}

interface Props {
  editor: Editor | null;
  defaultBibleId?: string;
  insertTarget?: 'editor' | 'passage';
  onInsertPassageReference?: (payload: { reference: string; text: string; version: string }) => void;
  onClose: () => void;
}

export function BibleModal({ editor, defaultBibleId, insertTarget = 'editor', onInsertPassageReference, onClose }: Props) {
  const [bibles, setBibles] = useState<BibleData[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>(defaultBibleId);
  const [active, setActive] = useState<BibleData | undefined>();
  const [mode, setMode] = useState<'ref' | 'text'>('ref');
  const [book, setBook] = useState('');
  const [chapter, setChapter] = useState('');
  const [vstart, setVstart] = useState('');
  const [vend, setVend] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ ref: string; text: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activePicker, setActivePicker] = useState<PickerType | null>(null);

  const previewPassage = useMemo(() => {
    if (!active || !book.trim()) return null;
    const ch = Number(chapter);
    const vs = Number(vstart);
    const ve = vend ? Number(vend) : undefined;

    if (!Number.isInteger(ch) || ch < 1) return null;
    if (!Number.isInteger(vs) || vs < 1) return null;
    if (ve !== undefined && (!Number.isInteger(ve) || ve < 1 || ve < vs)) return null;

    return getPassage(active, book.trim(), ch, vs, ve);
  }, [active, book, chapter, vstart, vend]);

  const selectedBook = useMemo(() => active?.books.find(entry => entry.name === book), [active, book]);
  const sortedBooks = useMemo(() => {
    if (!active) return [];
    return [...active.books].sort((left, right) => getBookMeta(left.name).order - getBookMeta(right.name).order);
  }, [active]);
  const testamentBooks = useMemo(() => ({
    antiguo: sortedBooks.filter(entry => getBookMeta(entry.name).testament === 'Antiguo Testamento'),
    nuevo: sortedBooks.filter(entry => getBookMeta(entry.name).testament === 'Nuevo Testamento'),
  }), [sortedBooks]);
  const chapterCount = selectedBook?.chapters.length ?? 0;
  const currentChapter = Number(chapter);
  const currentChapterVerses = Number.isInteger(currentChapter) && currentChapter > 0
    ? (selectedBook?.chapters[currentChapter - 1] ?? [])
    : [];
  const verseNumbers = currentChapterVerses.map(entry => entry.verse);
  const verseEndNumbers = verseNumbers.filter(number => !vstart || number >= Number(vstart));
  const pickerMeta = activePicker ? getPickerMeta(activePicker, book, chapter) : null;

  useEffect(() => { void listBibles().then(setBibles); }, []);
  useEffect(() => {
    if (!activeId && bibles.length) setActiveId(bibles[0].id);
  }, [bibles, activeId]);
  useEffect(() => {
    if (!activeId) return;
    void getBible(activeId).then(setActive);
  }, [activeId]);
  useEffect(() => {
    if (!active?.books.length) {
      setBook('');
      return;
    }
    if (!book || !active.books.some(entry => entry.name === book)) {
      setBook(active.books[0].name);
      setChapter('');
      setVstart('');
      setVend('');
    }
  }, [active, book]);

  useEffect(() => {
    setActivePicker(null);
  }, [mode, activeId]);

  function setPositiveNumberInput(setter: (value: string) => void, value: string) {
    setError(null);
    const cleaned = value.replace(/[^0-9]/g, '');
    if (!cleaned) {
      setter('');
      return;
    }
    setter(String(Math.max(1, Number(cleaned))));
  }

  function selectBook(nextBook: string) {
    setError(null);
    setBook(nextBook);
    setChapter('');
    setVstart('');
    setVend('');
    setActivePicker(null);
  }

  function selectChapter(nextChapter: number) {
    setError(null);
    setChapter(String(nextChapter));
    setVstart('');
    setVend('');
    setActivePicker(null);
  }

  function selectVerseStart(nextVerse: number) {
    setError(null);
    setVstart(String(nextVerse));
    if (vend && Number(vend) < nextVerse) setVend('');
    setActivePicker(null);
  }

  function selectVerseEnd(nextVerse: number | null) {
    setError(null);
    setVend(nextVerse ? String(nextVerse) : '');
    setActivePicker(null);
  }

  function renderNumberGrid(values: number[], selectedValue: string, onSelect: (value: number) => void, variant: 'chapter' | 'verseStart' | 'verseEnd') {
    return (
      <div className="bible-picker-grid bible-picker-grid-numbers" data-variant={variant}>
        {values.map(value => (
          <button
            key={value}
            type="button"
            className={`bible-picker-tile bible-picker-tile-number bible-picker-tile-${variant}${selectedValue === String(value) ? ' selected' : ''}`}
            onClick={() => onSelect(value)}
          >
            {value}
          </button>
        ))}
      </div>
    );
  }

  function insertRef() {
    if (!active) { setError('No hay Biblia cargada. Ve a Ajustes → Biblias.'); return; }
    if (!book.trim()) { setError('Selecciona un libro.'); return; }
    const ch = Number(chapter), vs = Number(vstart), ve = vend ? Number(vend) : undefined;
    if (!Number.isInteger(ch) || ch < 1) { setError('El capítulo debe ser 1 o mayor.'); return; }
    if (!Number.isInteger(vs) || vs < 1) { setError('El versículo debe ser 1 o mayor.'); return; }
    if (ve !== undefined && (!Number.isInteger(ve) || ve < 1)) { setError('El versículo final debe ser 1 o mayor.'); return; }
    if (ve !== undefined && ve < vs) { setError('El versículo final no puede ser menor que el inicial.'); return; }
    const p = getPassage(active, book.trim(), ch, vs, ve);
    if (!p) { setError('No se encontró el pasaje.'); return; }
    insertBibleContent(p.ref, p.text);
    onClose();
  }

  function runSearch() {
    if (!active) return;
    setResults(searchText(active, query, 80));
  }

  function insertResult(r: { ref: string; text: string }) {
    insertBibleContent(r.ref, r.text);
    onClose();
  }

  function insertBibleContent(ref: string, text: string) {
    if (insertTarget === 'passage') {
      onInsertPassageReference?.({
        reference: ref.replace(/\s+\([^)]+\)$/, ''),
        text,
        version: active?.abbreviation || active?.name || '',
      });
      return;
    }
    if (!editor) return;
    const chain = editor.chain();
    if (editor.isFocused) {
      chain.focus();
    } else {
      chain.focus('start');
    }
    chain.insertContent(buildBibleCitationSmartBlock(ref, text)).run();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Insertar de la Biblia</h3>
        {bibles.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>
            No hay Biblias cargadas. Ve a Ajustes → Biblias para importar un archivo JSON.
          </p>
        ) : (
          <>
            <div className="field">
              <label>Versión</label>
              <select value={activeId} onChange={e => { setError(null); setActiveId(e.target.value); }}>
                {bibles.map(b => <option key={b.id} value={b.id}>{b.name} ({b.abbreviation})</option>)}
              </select>
            </div>
            <div className="row" style={{ marginBottom: 10 }}>
              <button className={`ghost-btn ${mode === 'ref' ? 'primary-btn' : ''}`} onClick={() => setMode('ref')}>Por referencia</button>
              <button className={`ghost-btn ${mode === 'text' ? 'primary-btn' : ''}`} onClick={() => setMode('text')}>Por texto</button>
            </div>
            {mode === 'ref' ? (
              <>
                <div className="row" style={{ gap: 8 }}>
                  <div className="field" style={{ flex: 2 }}>
                    <label>Libro</label>
                    <button
                      type="button"
                      className="bible-picker-trigger bible-picker-trigger-book"
                      onClick={() => active && active.books.length > 0 && setActivePicker('book')}
                      disabled={!active || active.books.length === 0}
                    >
                      <span>{book || 'Seleccionar libro'}</span>
                      <span className="bible-picker-trigger-icon">▾</span>
                    </button>
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <label>Capítulo</label>
                    <button
                      type="button"
                      className="bible-picker-trigger"
                      onClick={() => chapterCount > 0 && setActivePicker('chapter')}
                      disabled={chapterCount === 0}
                    >
                      <span>{chapter || 'Cap.'}</span>
                      <span className="bible-picker-trigger-icon">▾</span>
                    </button>
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <label>Versículo</label>
                    <button
                      type="button"
                      className="bible-picker-trigger"
                      onClick={() => verseNumbers.length > 0 && setActivePicker('verseStart')}
                      disabled={verseNumbers.length === 0}
                    >
                      <span>{vstart || 'Vers.'}</span>
                      <span className="bible-picker-trigger-icon">▾</span>
                    </button>
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <label>Hasta</label>
                    <button
                      type="button"
                      className="bible-picker-trigger"
                      onClick={() => verseEndNumbers.length > 0 && setActivePicker('verseEnd')}
                      disabled={verseEndNumbers.length === 0}
                    >
                      <span>{vend || 'Hasta'}</span>
                      <span className="bible-picker-trigger-icon">▾</span>
                    </button>
                  </div>
                </div>
                <div className="bible-preview">
                  <div className="bible-preview-header">
                    <div>
                      <div className="bible-preview-eyebrow">Vista previa</div>
                      <div className="bible-preview-ref">{previewPassage?.ref ?? 'Selecciona libro, capítulo y versículo'}</div>
                    </div>
                    {active && <span className="bible-preview-version">{active.abbreviation || active.name}</span>}
                  </div>
                  <div className="bible-preview-body">
                    {previewPassage ? (
                      previewPassage.text
                    ) : (
                      insertTarget === 'passage'
                        ? 'Aquí podrás leer el pasaje antes de insertar la referencia en el campo Pasaje.'
                        : 'Aquí podrás leer el pasaje antes de insertarlo en el cuerpo del sermón.'
                    )}
                  </div>
                </div>
                {error && <div className="login-error">{error}</div>}
                <div className="modal-actions">
                  <button className="ghost-btn" onClick={onClose}>Cancelar</button>
                  <button className="primary-btn" onClick={insertRef} disabled={!previewPassage}>
                    {insertTarget === 'passage' ? 'Insertar referencia' : 'Insertar pasaje'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="row">
                  <input className="search-input" style={{ flex: 1 }} placeholder="Buscar texto…" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && runSearch()} />
                  <button className="primary-btn" onClick={runSearch}>Buscar</button>
                </div>
                <div style={{ maxHeight: 320, overflowY: 'auto', marginTop: 14 }}>
                  {results.map((r, i) => (
                    <div key={i} className="list-item" style={{ cursor: 'pointer' }} onClick={() => insertResult(r)}>
                      <div className="info">
                        <div className="name">{r.ref}</div>
                        <div className="desc">{r.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {activePicker && (
          <div className="bible-picker-overlay" data-picker={activePicker} onClick={() => setActivePicker(null)}>
            <div className="bible-picker-panel" data-picker={activePicker} onClick={e => e.stopPropagation()}>
              <div className="bible-picker-panel-header">
                <div>
                  <div className="bible-picker-panel-eyebrow">{pickerMeta?.eyebrow}</div>
                  <div className="bible-picker-panel-title">{pickerMeta?.title}</div>
                  <div className="bible-picker-panel-copy">{pickerMeta?.copy}</div>
                </div>
                <button type="button" className="ghost-btn" onClick={() => setActivePicker(null)}>Cerrar</button>
              </div>

              {activePicker === 'book' && (
                <div className="bible-picker-book-sections">
                  <section className="bible-picker-section bible-picker-section-old">
                    <div className="bible-picker-section-title">Antiguo Testamento</div>
                    <div className="bible-picker-grid bible-picker-grid-books">
                      {testamentBooks.antiguo.map(entry => (
                        <button
                          key={entry.name}
                          type="button"
                          className={`bible-picker-tile bible-picker-tile-book bible-picker-tile-book-old${book === entry.name ? ' selected' : ''}`}
                          onClick={() => selectBook(entry.name)}
                          title={entry.name}
                        >
                          <span className="bible-picker-book-abbr">{getBookMeta(entry.name).abbr}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                  <section className="bible-picker-section bible-picker-section-new">
                    <div className="bible-picker-section-title">Nuevo Testamento</div>
                    <div className="bible-picker-grid bible-picker-grid-books">
                      {testamentBooks.nuevo.map(entry => (
                        <button
                          key={entry.name}
                          type="button"
                          className={`bible-picker-tile bible-picker-tile-book bible-picker-tile-book-new${book === entry.name ? ' selected' : ''}`}
                          onClick={() => selectBook(entry.name)}
                          title={entry.name}
                        >
                          <span className="bible-picker-book-abbr">{getBookMeta(entry.name).abbr}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {activePicker === 'chapter' && renderNumberGrid(Array.from({ length: chapterCount }, (_, index) => index + 1), chapter, selectChapter, 'chapter')}
              {activePicker === 'verseStart' && renderNumberGrid(verseNumbers, vstart, selectVerseStart, 'verseStart')}
              {activePicker === 'verseEnd' && (
                <>
                  <div className="bible-picker-inline-actions">
                    <button type="button" className={`ghost-btn${vend === '' ? ' active' : ''}`} onClick={() => selectVerseEnd(null)}>
                      Solo ese versículo
                    </button>
                  </div>
                  {renderNumberGrid(verseEndNumbers, vend, value => selectVerseEnd(value), 'verseEnd')}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
