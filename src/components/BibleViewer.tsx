import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listBibles } from '@/bible/bibleService';
import type { BibleHighlightRange, BibleSearchMode, BibleTextSearchResult } from '@/bible/bibleService';
import { cleanVerse } from '@/bible/bibleService';
import { searchBibleTextDetailed } from '@/bible/bibleService';
import { getBookMeta } from '@/bible/bookMeta';
import { syncBibles } from '@/storage/bibleSync';
import { useAppStore } from '@/store';
import type { BibleData } from '@/types';

type ViewerPickerType = 'book' | 'chapter' | 'verseStart';

function getViewerPickerMeta(type: ViewerPickerType, bookName: string, chapter: number) {
  switch (type) {
    case 'book':
      return {
        eyebrow: 'Visor de Biblia',
        title: 'Libros de la Biblia',
        copy: 'Selecciona el libro desde tarjetas grandes, separadas por Antiguo y Nuevo Testamento.',
      };
    case 'chapter':
      return {
        eyebrow: 'Visor de Biblia',
        title: `Capítulos de ${bookName}`,
        copy: 'Toca un cuadro para ir directo al capítulo.',
      };
    case 'verseStart':
      return {
        eyebrow: 'Visor de Biblia',
        title: `Versículos de ${bookName} ${chapter}`,
        copy: 'Elige un versículo desde una cuadrícula táctil.',
      };
  }
}

export function BibleViewer() {
  const nav = useNavigate();
  const user = useAppStore(s => s.user);
  const defaultBibleId = useAppStore(s => s.settings.defaultBibleId);
  const [bibles, setBibles] = useState<BibleData[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bookName, setBookName] = useState('');
  const [chapter, setChapter] = useState(1);
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncLog, setSyncLog] = useState<string[]>([]);
  const [syncProgress, setSyncProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [fontSize, setFontSize] = useState(20);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BibleTextSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchMode, setSearchMode] = useState<BibleSearchMode | null>(null);
  const [activePicker, setActivePicker] = useState<ViewerPickerType | null>(null);

  const colRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isSyncingScroll = useRef(false);
  const activeScrollSource = useRef<number | null>(null);
  const scrollSourceReleaseTimer = useRef<number | null>(null);
  const ignoreSyncedScrollUntil = useRef(0);
  const pendingScrollVerse = useRef<number | null>(null);

  function addLog(msg: string, done?: number, total?: number) {
    setSyncLog(prev => [...prev, msg]);
    if (total !== undefined) setSyncProgress({ done: done ?? 0, total });
  }

  function selectInitialBible(list: BibleData[]) {
    const defaultBible = defaultBibleId ? list.find(bible => bible.id === defaultBibleId) : undefined;
    const initialBible = defaultBible ?? list[0];

    if (!initialBible) {
      setSelectedIds([]);
      setBookName('');
      return;
    }

    setSelectedIds([initialBible.id]);
    setBookName(initialBible.books[0]?.name ?? '');
    setChapter(1);
    setHighlighted(null);
  }

  useEffect(() => {
    async function load() {
      setSyncLog([]);
      setLoading(true);
      setSyncError(null);
      addLog(user ? `usuario: ${user.id}` : 'sin usuario — cargando local');
      if (user) {
        try {
          await syncBibles(user.id, addLog);
        } catch (e: any) {
          const msg = e?.message ?? String(e) ?? 'Error desconocido';
          setSyncError(msg);
          addLog(`❌ ${msg}`);
        }
      }
      addLog('cargando desde dispositivo…');
      const list = await listBibles();
      addLog(`${list.length} biblias en dispositivo`);
      setBibles(list);
      selectInitialBible(list);
      setLoading(false);
    }
    void load();
  }, [user?.id, defaultBibleId]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to a verse after book/chapter navigation
  useEffect(() => {
    const v = pendingScrollVerse.current;
    if (v === null) return;
    pendingScrollVerse.current = null;
    window.setTimeout(() => centerVerseInColumns(v), 80);
  }, [bookName, chapter]);

  const selectedBibles = selectedIds
    .map(id => bibles.find(b => b.id === id))
    .filter(Boolean) as BibleData[];

  // Book list from first selected bible (or first available)
  const refBible = selectedBibles[0] ?? bibles[0];
  const sortedBooks = useMemo(() => {
    if (!refBible) return [];
    return [...refBible.books].sort((left, right) => getBookMeta(left.name).order - getBookMeta(right.name).order);
  }, [refBible]);
  const testamentBooks = useMemo(() => ({
    antiguo: sortedBooks.filter(entry => getBookMeta(entry.name).testament === 'Antiguo Testamento'),
    nuevo: sortedBooks.filter(entry => getBookMeta(entry.name).testament === 'Nuevo Testamento'),
  }), [sortedBooks]);
  const bookNames = sortedBooks.map(b => b.name);
  const chapterCount = refBible?.books.find(b => b.name === bookName)?.chapters.length ?? 1;

  function getVerses(bible: BibleData) {
    const book = bible.books.find(b => b.name === bookName);
    if (!book) return [];
    return book.chapters[chapter - 1] ?? [];
  }

  const currentVerses = refBible ? getVerses(refBible) : [];
  const chapterNumbers = Array.from({ length: chapterCount }, (_, index) => index + 1);
  const verseNumbers = currentVerses.map(entry => entry.verse);
  const pickerMeta = activePicker ? getViewerPickerMeta(activePicker, bookName, chapter) : null;

  function releaseScrollSourceLater(srcIdx: number) {
    if (scrollSourceReleaseTimer.current !== null) {
      window.clearTimeout(scrollSourceReleaseTimer.current);
    }

    scrollSourceReleaseTimer.current = window.setTimeout(() => {
      if (activeScrollSource.current === srcIdx) activeScrollSource.current = null;
      scrollSourceReleaseTimer.current = null;
    }, 900);
  }

  function markUserScrollSource(srcIdx: number) {
    activeScrollSource.current = srcIdx;
    releaseScrollSourceLater(srcIdx);
  }

  function ignoreSyncedScrollsFor(ms: number) {
    ignoreSyncedScrollUntil.current = Date.now() + ms;
  }

  function centerVerseInColumns(verse: number, behavior: ScrollBehavior = 'smooth') {
    isSyncingScroll.current = true;
    activeScrollSource.current = null;
    ignoreSyncedScrollsFor(behavior === 'smooth' ? 1200 : 650);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        colRefs.current.forEach(col => {
          if (!col) return;
          const el = col.querySelector(`[data-verse="${verse}"]`) as HTMLElement | null;
          el?.scrollIntoView({ behavior, block: 'center' });
        });

        window.setTimeout(() => {
          isSyncingScroll.current = false;
          ignoreSyncedScrollsFor(behavior === 'smooth' ? 700 : 350);
        }, behavior === 'smooth' ? 700 : 300);
      });
    });
  }

  function handleScroll(e: React.UIEvent<HTMLDivElement>, srcIdx: number) {
    if (isSyncingScroll.current) return;
    if (activeScrollSource.current !== null && activeScrollSource.current !== srcIdx) return;
    if (Date.now() < ignoreSyncedScrollUntil.current && activeScrollSource.current !== srcIdx) return;

    markUserScrollSource(srcIdx);
    isSyncingScroll.current = true;
    ignoreSyncedScrollsFor(450);
    const el = e.currentTarget;
    const pct = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight);
    colRefs.current.forEach((col, i) => {
      if (i !== srcIdx && col) {
        col.scrollTop = pct * Math.max(1, col.scrollHeight - col.clientHeight);
      }
    });
    requestAnimationFrame(() => { isSyncingScroll.current = false; });
  }

  function toggleVersion(id: string) {
    setSelectedIds(prev => {
      let next = prev;
      if (prev.includes(id)) {
        if (prev.length > 1) next = prev.filter(x => x !== id); // keep at least one
      } else if (prev.length < 5) {
        next = [...prev, id];
      }

      if (next !== prev && highlighted !== null) isSyncingScroll.current = true;
      return next;
    });
  }

  function prevChapter() {
    if (chapter > 1) { setChapter(c => c - 1); setHighlighted(null); }
    else {
      const idx = bookNames.indexOf(bookName);
      if (idx > 0) {
        const prevBook = bookNames[idx - 1];
        const prevCount = refBible?.books.find(b => b.name === prevBook)?.chapters.length ?? 1;
        setBookName(prevBook);
        setChapter(prevCount);
        setHighlighted(null);
      }
    }
  }

  function nextChapter() {
    if (chapter < chapterCount) { setChapter(c => c + 1); setHighlighted(null); }
    else {
      const idx = bookNames.indexOf(bookName);
      if (idx < bookNames.length - 1) {
        setBookName(bookNames[idx + 1]);
        setChapter(1);
        setHighlighted(null);
      }
    }
  }

  function handleVerseSelect(v: number) {
    setHighlighted(v);
    centerVerseInColumns(v);
  }

  function selectBookFromPicker(nextBookName: string) {
    setBookName(nextBookName);
    setChapter(1);
    setHighlighted(null);
    setActivePicker(null);
  }

  function selectChapterFromPicker(nextChapter: number) {
    setChapter(nextChapter);
    setHighlighted(null);
    setActivePicker(null);
  }

  function selectVerseFromPicker(nextVerse: number) {
    setActivePicker(null);
    handleVerseSelect(nextVerse);
  }

  function renderViewerNumberGrid(values: number[], selectedValue: number | null, onSelect: (value: number) => void, variant: 'chapter' | 'verseStart') {
    return (
      <div className="bible-picker-grid bible-picker-grid-numbers" data-variant={variant}>
        {values.map(value => (
          <button
            key={value}
            type="button"
            className={`bible-picker-tile bible-picker-tile-number bible-picker-tile-${variant}${selectedValue === value ? ' selected' : ''}`}
            onClick={() => onSelect(value)}
          >
            {value}
          </button>
        ))}
      </div>
    );
  }

  function handleSearch() {
    if (!refBible || searchQuery.trim() === '') {
      setHasSearched(false);
      setSearchMode(null);
      setSearchResults([]);
      return;
    }
    setHasSearched(true);
    const response = searchBibleTextDetailed(refBible, searchQuery, 60);
    setSearchMode(response.matchMode);
    setSearchResults(response.results);
  }

  function goToResult(r: BibleTextSearchResult) {
    pendingScrollVerse.current = r.verse;
    setBookName(r.bookName);
    setChapter(r.chapter);
    setHighlighted(r.verse);
    setSearchResults([]);
    setShowSearch(false);
    setSearchQuery('');
    setHasSearched(false);
    setSearchMode(null);
  }

  const cols = selectedBibles.length || 1;
  const selectedIdsKey = selectedIds.join('|');

  useEffect(() => {
    if (highlighted === null) return;
    centerVerseInColumns(highlighted, 'auto');
  }, [selectedIdsKey, cols, bookName, chapter]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    const pct = syncProgress.total > 0 ? Math.round((syncProgress.done / syncProgress.total) * 100) : 0;
    return (
      <div className="bible-viewer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: 12, padding: 24 }}>
        <span style={{ fontSize: 28 }}>⏳</span>
        <span style={{ fontSize: 16, fontWeight: 600 }}>Sincronizando biblias</span>

        {/* Barra de progreso */}
        {syncProgress.total > 0 && (
          <div style={{ width: '100%', maxWidth: 320 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
              <span>{syncProgress.done} / {syncProgress.total} biblias</span>
              <span>{pct}%</span>
            </div>
            <div style={{ width: '100%', height: 10, background: 'rgba(128,128,128,0.25)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 99, transition: 'width 0.4s ease' }} />
            </div>
          </div>
        )}

        {/* Log detallado */}
        <div style={{ width: '100%', maxWidth: 320, maxHeight: 140, overflowY: 'auto', background: 'rgba(0,0,0,0.12)', borderRadius: 8, padding: '7px 10px' }}>
          {syncLog.map((line, i) => (
            <div key={i} style={{ fontSize: 11, fontFamily: 'monospace', color: line.startsWith('✗') ? '#e55' : 'var(--accent)', lineHeight: 1.6, wordBreak: 'break-all' }}>{line}</div>
          ))}
        </div>

        <span style={{ fontSize: 11, opacity: 0.4, maxWidth: 280, textAlign: 'center' }}>Solo ocurre la primera vez en este dispositivo</span>
      </div>
    );
  }

  if (syncError) {
    return (
      <div className="bible-viewer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: 12, padding: 24 }}>
        <span style={{ fontSize: 22 }}>⚠️</span>
        <span style={{ fontSize: 15, fontWeight: 600 }}>No se pudo sincronizar</span>
        <span style={{ fontSize: 12, opacity: 0.6, maxWidth: 300, textAlign: 'center' }}>{syncError}</span>
        <button className="primary-btn" style={{ marginTop: 12 }} onClick={() => { setSyncError(null); setLoading(true); void (async () => { try { if (user) await syncBibles(user.id); } catch {} const list = await listBibles(); setBibles(list); selectInitialBible(list); setLoading(false); })(); }}>
          Reintentar
        </button>
        <button className="ghost-btn" onClick={() => nav(-1)}>← Volver</button>
      </div>
    );
  }

  if (bibles.length === 0) {
    return (
      <div className="bible-viewer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: 10, padding: 24 }}>
        <span style={{ fontSize: 22 }}>📖</span>
        <span style={{ fontSize: 15, opacity: 0.7 }}>No hay biblias disponibles</span>
        {syncLog.length > 0 && (
          <div style={{ width: '100%', maxWidth: 340, maxHeight: 200, overflowY: 'auto', background: 'rgba(0,0,0,0.15)', borderRadius: 8, padding: '8px 10px' }}>
            {syncLog.map((line, i) => (
              <div key={i} style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--accent)', lineHeight: 1.6, wordBreak: 'break-all' }}>{line}</div>
            ))}
          </div>
        )}
        <span style={{ fontSize: 12, opacity: 0.45, maxWidth: 280, textAlign: 'center' }}>Importa biblias desde Ajustes → Biblias</span>
        <button className="ghost-btn" style={{ marginTop: 8 }} onClick={() => nav(-1)}>← Volver</button>
      </div>
    );
  }

  return (
    <div className="bible-viewer">
      <div className="bible-viewer-toolbar">
        <button className="ghost-btn bv-back" onClick={() => nav(-1)}>← Volver</button>

        <button
          type="button"
          className="bible-picker-trigger bible-picker-trigger-book bv-picker-trigger bv-picker-trigger-book"
          onClick={() => sortedBooks.length > 0 && setActivePicker('book')}
          disabled={sortedBooks.length === 0}
          title="Libro"
        >
          <span>{bookName || 'Libro'}</span>
          <span className="bible-picker-trigger-icon">▾</span>
        </button>

        <div className="bv-chapter-nav">
          <button className="ghost-btn" onClick={prevChapter}>‹</button>
          <button
            type="button"
            className="bible-picker-trigger bv-picker-trigger bv-picker-trigger-chapter"
            onClick={() => chapterCount > 0 && setActivePicker('chapter')}
            disabled={chapterCount === 0}
            title="Capítulo"
          >
            <span>Cap. {chapter} <span className="bv-chapter-total">/ {chapterCount}</span></span>
            <span className="bible-picker-trigger-icon">▾</span>
          </button>
          <button className="ghost-btn" onClick={nextChapter}>›</button>
        </div>

        <button
          type="button"
          className="bible-picker-trigger bv-picker-trigger bv-picker-trigger-verse"
          onClick={() => verseNumbers.length > 0 && setActivePicker('verseStart')}
          disabled={verseNumbers.length === 0}
          title="Ir a versículo"
        >
          <span>{highlighted ?? 'Vers.'}</span>
          <span className="bible-picker-trigger-icon">▾</span>
        </button>

        <div className="bv-font-controls">
          <button className="ghost-btn bv-font-btn" onClick={() => setFontSize(s => Math.max(11, s - 1))} title="Reducir texto">A−</button>
          <button className="ghost-btn bv-font-btn" onClick={() => setFontSize(s => Math.min(40, s + 1))} title="Aumentar texto">A+</button>
        </div>

        <button
          className={`ghost-btn bv-search-toggle${showSearch ? ' bv-search-toggle-active' : ''}`}
          onClick={() => {
            setShowSearch(s => !s);
            setSearchResults([]);
            setSearchQuery('');
            setHasSearched(false);
            setSearchMode(null);
          }}
          title="Buscar en la Biblia"
        >
          🔍
        </button>

        <div className="bv-version-pills">
          {bibles.map(b => {
            const active = selectedIds.includes(b.id);
            const disabled = !active && selectedIds.length >= 5;
            return (
              <button
                key={b.id}
                className={`bv-pill ${active ? 'bv-pill-active' : ''}`}
                onClick={() => !disabled && toggleVersion(b.id)}
                style={{ opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
                title={disabled ? 'Máximo 5 versiones' : b.name}
              >
                {b.abbreviation || b.name}
              </button>
            );
          })}
        </div>
      </div>

      {showSearch && (
        <div className="bv-search-row">
          <div className="bv-search-wrap">
            <input
              className="bv-search-input"
              type="text"
              placeholder="Buscar palabra o frase en la Biblia…"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setSearchResults([]);
                setHasSearched(false);
                setSearchMode(null);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSearch();
                if (e.key === 'Escape') {
                  setShowSearch(false);
                  setSearchResults([]);
                  setSearchQuery('');
                  setHasSearched(false);
                  setSearchMode(null);
                }
              }}
              autoFocus
            />
            <button className="primary-btn bv-search-btn" onClick={handleSearch}>Buscar</button>
            {searchResults.length > 0 && (
              <button className="ghost-btn" onClick={() => { setSearchResults([]); setHasSearched(false); setSearchMode(null); }}>✕</button>
            )}
          </div>
          {searchResults.length > 0 && (
            <div className="bv-search-results">
              <div className="bv-search-count">
                {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}
                {searchResults.length >= 60 ? ' (primeros 60)' : ''}
                {searchMode === 'phrase' ? ' por frase exacta' : ''}
                {searchMode === 'terms' ? ' por coincidencia de palabras' : ''}
              </div>
              {searchResults.map((r, i) => (
                <div key={i} className="bv-search-result-item" onClick={() => goToResult(r)}>
                  <span className="bv-search-ref">{r.bookName} {r.chapter}:{r.verse}</span>
                  <span className="bv-search-text">{renderHighlightedVerse(r.text, r.highlights)}</span>
                </div>
              ))}
            </div>
          )}
          {!hasSearched && searchQuery.trim() !== '' && searchResults.length === 0 && (
            <div className="bv-search-empty">Presiona Buscar o Enter para iniciar la búsqueda</div>
          )}
          {hasSearched && searchQuery.trim() !== '' && searchResults.length === 0 && (
            <div className="bv-search-empty">No se encontraron resultados para esa palabra o frase.</div>
          )}
        </div>
      )}

      {bibles.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 60 }}>
          <p>No hay Biblias cargadas.</p>
          <button className="primary-btn" onClick={() => nav('/settings')}>Ir a Ajustes → Biblias</button>
        </div>
      ) : (
        <div
          className="bv-columns"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, '--bv-font-size': `${fontSize}px` } as React.CSSProperties}
        >
          {selectedBibles.map((bible, i) => {
            const verses = getVerses(bible);
            return (
              <div
                key={bible.id}
                className="bv-col"
                ref={el => { colRefs.current[i] = el; }}
                onPointerDown={() => markUserScrollSource(i)}
                onTouchStart={() => markUserScrollSource(i)}
                onWheel={() => markUserScrollSource(i)}
                onScroll={e => handleScroll(e, i)}
              >
                <div className="bv-col-header">
                  {bible.name}
                  {bible.abbreviation && <span className="bv-col-abbr"> ({bible.abbreviation})</span>}
                </div>
                {verses.length === 0 ? (
                  <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 14 }}>
                    Libro no encontrado en esta versión.
                  </div>
                ) : (
                  verses.map(v => (
                    <div
                      key={v.verse}
                      data-verse={v.verse}
                      className={`bv-verse ${highlighted === v.verse ? 'bv-verse-hl' : ''}`}
                      onClick={() => setHighlighted(prev => prev === v.verse ? null : v.verse)}
                    >
                      <sup className="bv-verse-num">{v.verse}</sup>
                      <span className="bv-verse-text" style={{ fontSize: `${fontSize}px` }}>{cleanVerse(v.text)}</span>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
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
                        className={`bible-picker-tile bible-picker-tile-book bible-picker-tile-book-old${bookName === entry.name ? ' selected' : ''}`}
                        onClick={() => selectBookFromPicker(entry.name)}
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
                        className={`bible-picker-tile bible-picker-tile-book bible-picker-tile-book-new${bookName === entry.name ? ' selected' : ''}`}
                        onClick={() => selectBookFromPicker(entry.name)}
                        title={entry.name}
                      >
                        <span className="bible-picker-book-abbr">{getBookMeta(entry.name).abbr}</span>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activePicker === 'chapter' && renderViewerNumberGrid(chapterNumbers, chapter, selectChapterFromPicker, 'chapter')}
            {activePicker === 'verseStart' && renderViewerNumberGrid(verseNumbers, highlighted, selectVerseFromPicker, 'verseStart')}
          </div>
        </div>
      )}
    </div>
  );
}

function renderHighlightedVerse(text: string, highlights: BibleHighlightRange[]) {
  if (highlights.length === 0) return text;

  const content: Array<string | JSX.Element> = [];
  let cursor = 0;

  highlights.forEach((highlight, index) => {
    if (highlight.start > cursor) {
      content.push(text.slice(cursor, highlight.start));
    }
    content.push(
      <strong key={`${highlight.start}-${highlight.end}-${index}`} className="bv-search-hit">
        {text.slice(highlight.start, highlight.end)}
      </strong>
    );
    cursor = highlight.end;
  });

  if (cursor < text.length) {
    content.push(text.slice(cursor));
  }

  return content;
}
