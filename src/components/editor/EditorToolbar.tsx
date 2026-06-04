import { useState, useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';
import type { Editor } from '@tiptap/react';
import { EditorContent } from '@tiptap/react';
import { FONT_FAMILIES } from '@/constants';

interface Props { editor: Editor | null; }

const TEXT_PRESETS = [
  '#111827','#374151','#6B7280','#9CA3AF','#FFFFFF',
  '#DC2626','#EA580C','#D97706','#16A34A','#0D9488',
  '#2563EB','#4F46E5','#7C3AED','#DB2777','#92400E',
];
const HL_PRESETS = [
  '#FEF08A','#BBF7D0','#BAE6FD','#FBCFE8','#E9D5FF',
  '#FED7AA','#FECACA','#99F6E4','#D9F99D','#FDE68A',
  '#CFFAFE','#DDD6FE','#FFE4E6','#FFEDD5','#FEF9C3',
];
const KEY_TEXT = 'smp_custom_text_clr';
const KEY_HL   = 'smp_custom_hl_clr';

function loadCustom(k: string): string[] {
  try { return JSON.parse(localStorage.getItem(k) ?? '[]'); } catch { return []; }
}
function addCustomColor(k: string, color: string): string[] {
  const prev = loadCustom(k).filter(c => c !== color);
  const next = [...prev, color].slice(-8);
  localStorage.setItem(k, JSON.stringify(next));
  return next;
}

function toHex(color: string | undefined | null, fallback: string): string {
  if (!color) return fallback;
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  const m = color.match(/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/);
  if (m) return `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}`;
  return fallback;
}

interface PaletteProps {
  presets: string[];
  storageKey: string;
  current: string;
  wrapRef: React.RefObject<HTMLDivElement>;
  onSelect: (color: string) => void;
  onClose: () => void;
}
function ColorPalette({ presets, storageKey, current, wrapRef, onSelect, onClose }: PaletteProps) {
  const [custom, setCustom] = useState<string[]>(() => loadCustom(storageKey));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [wrapRef, onClose]);

  function pick(color: string) { onSelect(color); onClose(); }

  function handleCustomChange(e: React.ChangeEvent<HTMLInputElement>) {
    const color = e.target.value;
    const next = addCustomColor(storageKey, color);
    setCustom(next);
    pick(color);
  }

  return (
    <div className="color-palette">
      <div className="color-palette-grid">
        {[...presets, ...custom].map(c => (
          <button
            key={c}
            className={`color-swatch${c.toLowerCase() === current.toLowerCase() ? ' selected' : ''}`}
            style={{ background: c, outline: c.toUpperCase() === '#FFFFFF' ? '1px solid #d1d5db' : 'none' }}
            title={c}
            onClick={() => pick(c)}
          />
        ))}
        <label className="color-swatch color-swatch-add" title="Color personalizado">
          +
          <input ref={inputRef} type="color" style={{ display: 'none' }} onChange={handleCustomChange} />
        </label>
      </div>
    </div>
  );
}

export function EditorToolbar({ editor }: Props) {
  if (!editor) return null;
  const ed = editor;
  const [openPicker, setOpenPicker] = useState<'text' | 'hl' | null>(null);
  const [toolbarVersion, setToolbarVersion] = useState(0);
  const textWrapRef = useRef<HTMLDivElement>(null);
  const hlWrapRef   = useRef<HTMLDivElement>(null);
  const on = (name: string, attrs?: Record<string, unknown>) => ed.isActive(name, attrs as any);
  const al = (a: string) => ed.isActive({ textAlign: a } as any);

  useEffect(() => {
    function refreshToolbar() {
      setToolbarVersion(version => version + 1);
    }

    ed.on('selectionUpdate', refreshToolbar);
    ed.on('transaction', refreshToolbar);

    return () => {
      ed.off('selectionUpdate', refreshToolbar);
      ed.off('transaction', refreshToolbar);
    };
  }, [ed]);

  const editorDefaults = getEditorDefaults(ed);
  const activeFontFamily = normalizeFontFamily(ed.getAttributes('textStyle')?.fontFamily) ?? editorDefaults.fontFamily;
  const activeFontSize = normalizeFontSize(ed.getAttributes('textStyle')?.fontSize) ?? editorDefaults.fontSize;

  const textColor = toHex(ed.getAttributes('textStyle')?.color, '#111827');
  const hlColor   = toHex(
    ed.isActive('highlight') ? ed.getAttributes('highlight')?.color : undefined,
    '#fef08a'
  );

  function setFontSize(px: number) {
    if (!px) return;
    ed.chain().focus().setMark('textStyle', { fontSize: `${px}px` }).run();
  }

  void toolbarVersion;

  return (
    <div className="editor-toolbar-shell">
      <div className="editor-toolbar">

        {/* Deshacer / Rehacer */}
        <div className="group">
          <button className="tb-btn tb-mobile-fallback" onClick={() => ed.chain().focus().undo().run()} title="Deshacer">
            <span className="tb-mobile-label">Des</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>
            </svg>
          </button>
          <button className="tb-btn tb-mobile-fallback" onClick={() => ed.chain().focus().redo().run()} title="Rehacer">
            <span className="tb-mobile-label">Reh</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>
            </svg>
          </button>
        </div>

        {/* Estilo / Tipografía / Tamaño */}
        <div className="group">
          <select className="tb-select" value={getActiveHeading(editor)} onChange={(e) => {
            const v = e.target.value;
            if (v === 'p') ed.chain().focus().setParagraph().run();
            else ed.chain().focus().toggleHeading({ level: Number(v) as 1|2|3|4 }).run();
          }}>
            <option value="p">Párrafo</option>
            <option value="1">Título 1</option>
            <option value="2">Título 2</option>
            <option value="3">Título 3</option>
            <option value="4">Título 4</option>
          </select>
          <select className="tb-select" value={activeFontFamily} onChange={(e) => ed.chain().focus().setFontFamily(e.target.value).run()}>
            {FONT_FAMILIES.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
          </select>
          <input className="tb-number" type="number" min={8} max={120} value={activeFontSize}
            onChange={(e) => setFontSize(Number(e.target.value))} title="Tamaño de fuente" />
        </div>

        {/* Formato */}
        <div className="group">
          <button className={`tb-btn tb-fmt ${on('bold') ? 'active' : ''}`} onClick={() => ed.chain().focus().toggleBold().run()} title="Negrita"><b>B</b></button>
          <button className={`tb-btn tb-fmt ${on('italic') ? 'active' : ''}`} onClick={() => ed.chain().focus().toggleItalic().run()} title="Cursiva"><em>I</em></button>
          <button className={`tb-btn tb-fmt ${on('underline') ? 'active' : ''}`} onClick={() => ed.chain().focus().toggleUnderline().run()} title="Subrayado"><u>U</u></button>
          <button className={`tb-btn tb-fmt ${on('strike') ? 'active' : ''}`} onClick={() => ed.chain().focus().toggleStrike().run()} title="Tachado"><s>S</s></button>
        </div>

        {/* Color de texto / Resaltado */}
        <div className="group">
          <div ref={textWrapRef} style={{ position: 'relative' }}>
            <button
              className="tb-btn tb-color-btn"
              title="Color de texto"
              onClick={() => setOpenPicker(p => p === 'text' ? null : 'text')}
            >
              <span className="tb-color-a" style={{ '--clr': textColor } as CSSProperties}>A</span>
            </button>
            {openPicker === 'text' && (
              <ColorPalette
                presets={TEXT_PRESETS}
                storageKey={KEY_TEXT}
                current={textColor}
                wrapRef={textWrapRef as React.RefObject<HTMLDivElement>}
                onSelect={c => ed.chain().focus().setColor(c).run()}
                onClose={() => setOpenPicker(null)}
              />
            )}
          </div>
          <div ref={hlWrapRef} style={{ position: 'relative' }}>
            <button
              className="tb-btn tb-color-btn"
              title="Color de resaltado"
              onClick={() => setOpenPicker(p => p === 'hl' ? null : 'hl')}
            >
              <span className="tb-hl-a" style={{ '--clr': hlColor } as CSSProperties}>A</span>
            </button>
            {openPicker === 'hl' && (
              <ColorPalette
                presets={HL_PRESETS}
                storageKey={KEY_HL}
                current={hlColor}
                wrapRef={hlWrapRef as React.RefObject<HTMLDivElement>}
                onSelect={c => ed.chain().focus().toggleHighlight({ color: c }).run()}
                onClose={() => setOpenPicker(null)}
              />
            )}
          </div>
        </div>

        {/* Alineación */}
        <div className="group">
        <button className={`tb-btn tb-mobile-fallback ${al('left') ? 'active' : ''}`} onClick={() => ed.chain().focus().setTextAlign('left').run()} title="Izquierda">
          <span className="tb-mobile-label">Izq</span>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <rect x="1" y="2"    width="14" height="1.8" rx="0.5"/>
            <rect x="1" y="5.7"  width="9"  height="1.8" rx="0.5"/>
            <rect x="1" y="9.4"  width="12" height="1.8" rx="0.5"/>
            <rect x="1" y="13.1" width="7"  height="1.8" rx="0.5"/>
          </svg>
        </button>
        <button className={`tb-btn tb-mobile-fallback ${al('center') ? 'active' : ''}`} onClick={() => ed.chain().focus().setTextAlign('center').run()} title="Centro">
          <span className="tb-mobile-label">Ctr</span>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <rect x="1"   y="2"    width="14" height="1.8" rx="0.5"/>
            <rect x="3.5" y="5.7"  width="9"  height="1.8" rx="0.5"/>
            <rect x="2"   y="9.4"  width="12" height="1.8" rx="0.5"/>
            <rect x="4.5" y="13.1" width="7"  height="1.8" rx="0.5"/>
          </svg>
        </button>
        <button className={`tb-btn tb-mobile-fallback ${al('right') ? 'active' : ''}`} onClick={() => ed.chain().focus().setTextAlign('right').run()} title="Derecha">
          <span className="tb-mobile-label">Der</span>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <rect x="1" y="2"    width="14" height="1.8" rx="0.5"/>
            <rect x="6" y="5.7"  width="9"  height="1.8" rx="0.5"/>
            <rect x="3" y="9.4"  width="12" height="1.8" rx="0.5"/>
            <rect x="8" y="13.1" width="7"  height="1.8" rx="0.5"/>
          </svg>
        </button>
        <button className={`tb-btn tb-mobile-fallback ${al('justify') ? 'active' : ''}`} onClick={() => ed.chain().focus().setTextAlign('justify').run()} title="Justificar">
          <span className="tb-mobile-label">Just</span>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <rect x="1" y="2"    width="14" height="1.8" rx="0.5"/>
            <rect x="1" y="5.7"  width="14" height="1.8" rx="0.5"/>
            <rect x="1" y="9.4"  width="14" height="1.8" rx="0.5"/>
            <rect x="1" y="13.1" width="9"  height="1.8" rx="0.5"/>
          </svg>
        </button>
        </div>

        {/* Listas */}
        <div className="group">
        <button className={`tb-btn tb-mobile-fallback ${on('bulletList') ? 'active' : ''}`} onClick={() => ed.chain().focus().toggleBulletList().run()} title="Lista con viñetas">
          <span className="tb-mobile-label">Viñ</span>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="2.4" cy="3.8"  r="1.2"/>
            <rect x="5.2" y="3"    width="9.8" height="1.7" rx="0.5"/>
            <circle cx="2.4" cy="8.4"  r="1.2"/>
            <rect x="5.2" y="7.5"  width="9.8" height="1.7" rx="0.5"/>
            <circle cx="2.4" cy="13"   r="1.2"/>
            <rect x="5.2" y="12.2" width="9.8" height="1.7" rx="0.5"/>
          </svg>
        </button>
        <button className={`tb-btn tb-mobile-fallback ${on('orderedList') ? 'active' : ''}`} onClick={() => ed.chain().focus().toggleOrderedList().run()} title="Lista numerada">
          <span className="tb-mobile-label">1.</span>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <text x="0.5" y="5.5"  fontSize="5" fontFamily="system-ui,sans-serif" fontWeight="700">1.</text>
            <rect x="5.2" y="3"    width="9.8" height="1.7" rx="0.5"/>
            <text x="0.5" y="10"   fontSize="5" fontFamily="system-ui,sans-serif" fontWeight="700">2.</text>
            <rect x="5.2" y="7.5"  width="9.8" height="1.7" rx="0.5"/>
            <text x="0.5" y="14.5" fontSize="5" fontFamily="system-ui,sans-serif" fontWeight="700">3.</text>
            <rect x="5.2" y="12.2" width="9.8" height="1.7" rx="0.5"/>
          </svg>
        </button>
        <button className={`tb-btn tb-mobile-fallback ${on('taskList') ? 'active' : ''}`} onClick={() => ed.chain().focus().toggleTaskList().run()} title="Lista de verificación">
          <span className="tb-mobile-label">Tarea</span>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="2.5" width="4" height="4" rx="0.8"/>
            <polyline points="1.8 4.5 2.8 5.5 4.8 3.2"/>
            <rect x="1" y="9.5" width="4" height="4" rx="0.8"/>
            <line x1="7" y1="4.5"  x2="15" y2="4.5"/>
            <line x1="7" y1="11.5" x2="15" y2="11.5"/>
          </svg>
        </button>
        </div>

        {/* Insertar */}
        <div className="group">
        <button className="tb-btn tb-mobile-fallback" title="Hipervínculo" onClick={() => {
          const url = prompt('URL:');
          if (url) ed.chain().focus().setLink({ href: url }).run();
        }}>
          <span className="tb-mobile-label">Link</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </button>
        <button className="tb-btn tb-mobile-fallback" title="Imagen" onClick={() => {
          const url = prompt('URL de imagen:');
          if (url) ed.chain().focus().setImage({ src: url }).run();
        }}>
          <span className="tb-mobile-label">Img</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </button>
        <button className="tb-btn tb-mobile-fallback" title="Tabla" onClick={() => ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          <span className="tb-mobile-label">Tabla</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <line x1="3"  y1="9"  x2="21" y2="9"/>
            <line x1="3"  y1="15" x2="21" y2="15"/>
            <line x1="9"  y1="3"  x2="9"  y2="21"/>
            <line x1="15" y1="3"  x2="15" y2="21"/>
          </svg>
        </button>
        </div>

      </div>
    </div>
  );
}

function getEditorDefaults(editor: Editor): { fontFamily: string; fontSize: number } {
  if (typeof window === 'undefined') {
    return { fontFamily: 'Inter', fontSize: 17 };
  }

  const dom = editor.view.dom as HTMLElement | null;
  if (!dom) {
    return { fontFamily: 'Inter', fontSize: 17 };
  }

  const computed = window.getComputedStyle(dom);
  const matchedFont = FONT_FAMILIES.find(font => computed.fontFamily.toLowerCase().includes(font.toLowerCase())) ?? 'Inter';
  const parsedFontSize = Number.parseInt(computed.fontSize, 10);

  return {
    fontFamily: matchedFont,
    fontSize: Number.isFinite(parsedFontSize) ? parsedFontSize : 17,
  };
}

function normalizeFontFamily(value: string | null | undefined): string | null {
  if (!value) return null;
  return FONT_FAMILIES.find(font => value.toLowerCase().includes(font.toLowerCase())) ?? value;
}

function normalizeFontSize(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function getActiveHeading(editor: Editor): string {
  for (const lvl of [1, 2, 3, 4]) if (editor.isActive('heading', { level: lvl })) return String(lvl);
  return 'p';
}

export function EditorBody({ editor }: Props) {
  return (
    <div className="tiptap-wrap">
      <EditorContent editor={editor} />
    </div>
  );
}
