import { useAppStore } from '@/store';
import { FONT_FAMILIES, APP_VERSION } from '@/constants';

async function forceAppUpdate() {
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  }
  window.location.reload();
}

export function GeneralSettings() {
  const settings = useAppStore(s => s.settings);
  const update = useAppStore(s => s.updateSettings);

  return (
    <div>
      <div className="field">
        <label>Tema</label>
        <select value={settings.theme} onChange={e => update({ theme: e.target.value as 'light' | 'dark' })}>
          <option value="light">Claro</option>
          <option value="dark">Oscuro</option>
        </select>
      </div>
      <div className="field">
        <label>Tipografía por defecto en predicación</label>
        <select value={settings.predFontFamily} onChange={e => update({ predFontFamily: e.target.value })}>
          {FONT_FAMILIES.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Tamaño por defecto en predicación (px)</label>
        <input type="number" min={14} max={96} value={settings.predFontSizePx} onChange={e => update({ predFontSizePx: Number(e.target.value) })} />
      </div>
      <div className="field">
        <label>Velocidad de predicación (palabras por minuto)</label>
        <input type="number" min={60} max={250} value={settings.wordsPerMinute} onChange={e => update({ wordsPerMinute: Number(e.target.value) })} />
      </div>
      <div className="field">
        <label>
          <input type="checkbox" checked={settings.showAIExampleIfEmpty} onChange={e => update({ showAIExampleIfEmpty: e.target.checked })} />{' '}
          Mostrar ejemplo IA en bloque "Tu Historia" si está vacío
        </label>
      </div>
      <div className="field">
        <label>
          <input type="checkbox" checked={settings.ocultarNotasPrivadas} onChange={e => update({ ocultarNotasPrivadas: e.target.checked })} />{' '}
          Ocultar notas privadas en modo predicación
        </label>
      </div>

      <div className="field" style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Versión de la app</span>
          <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent)' }}>v{APP_VERSION}</span>
        </label>
      </div>
      <div className="field">
        <button
          className="ghost-btn"
          style={{ width: '100%' }}
          onClick={forceAppUpdate}
        >
          🔄 Forzar actualización (limpiar caché)
        </button>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
          Limpia todos los archivos en caché y recarga la app desde el servidor. Útil si los cambios no aparecen.
        </p>
      </div>
    </div>
  );
}
