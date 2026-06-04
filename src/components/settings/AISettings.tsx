import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/storage/db';
import { generateSermon, testAIProviderConnection } from '@/ai/aiClient';
import { nanoid } from 'nanoid';
import { useAppStore } from '@/store';
import { pushSermonType, deleteSermonTypeRemote } from '@/storage/seed';
import type { SermonType, AIProvider } from '@/types';

export function AISettings() {
  const tipos = useLiveQuery(() => localDB.sermonTypes.toArray(), []) ?? [];
  const settings = useAppStore(s => s.settings);
  const updateSettings = useAppStore(s => s.updateSettings);
  const user = useAppStore(s => s.user)!;
  const [editing, setEditing] = useState<SermonType | null>(null);
  const [providerDraft, setProviderDraft] = useState<AIProvider>(settings.aiProvider);
  const [claudeKeyDraft, setClaudeKeyDraft] = useState(settings.claudeApiKey ?? '');
  const [savingApiSettings, setSavingApiSettings] = useState(false);
  const [apiSettingsMessage, setApiSettingsMessage] = useState('');
  const [apiSettingsError, setApiSettingsError] = useState('');
  const [testingProvider, setTestingProvider] = useState(false);
  const [providerTestMessage, setProviderTestMessage] = useState('');
  const [providerTestError, setProviderTestError] = useState('');

  useEffect(() => {
    setProviderDraft(settings.aiProvider);
    setClaudeKeyDraft(settings.claudeApiKey ?? '');
  }, [settings.aiProvider, settings.claudeApiKey]);

  const hasPendingApiChanges =
    providerDraft !== settings.aiProvider
    || claudeKeyDraft !== (settings.claudeApiKey ?? '');

  async function save(t: SermonType) {
    await localDB.sermonTypes.put(t);
    void pushSermonType(t, user.id);
    setEditing(null);
  }
  async function toggle(t: SermonType) {
    const updated = { ...t, activo: !t.activo };
    await localDB.sermonTypes.put(updated);
    void pushSermonType(updated, user.id);
  }
  async function restore(t: SermonType) {
    if (t.promptOriginal) {
      const updated = { ...t, prompt: t.promptOriginal };
      await localDB.sermonTypes.put(updated);
      void pushSermonType(updated, user.id);
    }
  }
  async function clone(t: SermonType) {
    const c: SermonType = { ...t, id: `${t.id}-${nanoid(5)}`, nombre: `${t.nombre} (copia)`, builtin: false };
    await localDB.sermonTypes.put(c);
    void pushSermonType(c, user.id);
  }
  async function remove(t: SermonType) {
    if (t.builtin) { alert('Los tipos predeterminados no se pueden eliminar, solo desactivar.'); return; }
    if (confirm(`¿Eliminar "${t.nombre}"?`)) {
      await localDB.sermonTypes.delete(t.id);
      void deleteSermonTypeRemote(t.id, user.id);
    }
  }
  function nuevo() {
    setEditing({
      id: `custom-${nanoid(6)}`,
      nombre: 'Nuevo tipo',
      descripcion: '',
      prompt: 'Eres un predicador experto. Genera un sermón sobre {TEMA}.',
      activo: true,
      builtin: false,
      incluirTuHistoria: true,
      puntosSugeridos: 4
    });
  }

  async function testProvider() {
    setApiSettingsMessage('');
    setApiSettingsError('');
    setTestingProvider(true);
    setProviderTestMessage('');
    setProviderTestError('');
    try {
      if (hasPendingApiChanges) {
        await saveApiSettings();
      }
      const result = await testAIProviderConnection();
      setProviderTestMessage(result.message);
    } catch (e: any) {
      setProviderTestError(e?.message ?? 'No se pudo probar la conexión.');
    } finally {
      setTestingProvider(false);
    }
  }

  async function saveApiSettings() {
    setSavingApiSettings(true);
    setApiSettingsMessage('');
    setApiSettingsError('');
    try {
      await updateSettings({
        aiProvider: providerDraft,
        claudeApiKey: claudeKeyDraft.trim()
      });
      setApiSettingsMessage('APIs guardadas correctamente.');
    } catch (e: any) {
      setApiSettingsError(e?.message ?? 'No se pudieron guardar las APIs.');
      throw e;
    } finally {
      setSavingApiSettings(false);
    }
  }

  return (
    <div>
      <div className="field">
        <label>Proveedor de IA</label>
        <select value={providerDraft} onChange={e => setProviderDraft(e.target.value as AIProvider)}>
          <option value="claude">Claude Sonnet</option>
        </select>
      </div>
      <div className="field">
        <label>API key de Claude Sonnet</label>
        <input
          type="password"
          value={claudeKeyDraft}
          onChange={e => setClaudeKeyDraft(e.target.value)}
          placeholder="sk-ant-..."
          autoComplete="off"
          spellCheck={false}
        />
        <small style={{ color: 'var(--text-muted)' }}>
          Si la pegas aquí, la app usará tu propia clave de Claude cuando Claude Sonnet sea el proveedor activo.
        </small>
      </div>
      <div className="row" style={{ gap: 12, marginBottom: 14, alignItems: 'center' }}>
        <button className="primary-btn" onClick={() => void saveApiSettings()} disabled={savingApiSettings || !hasPendingApiChanges}>
          {savingApiSettings ? 'Guardando APIs…' : 'Guardar APIs'}
        </button>
        {hasPendingApiChanges && <span className="pill">Cambios sin guardar</span>}
        {apiSettingsMessage && <span className="pill" style={{ color: '#166534', borderColor: '#86efac', background: '#f0fdf4' }}>{apiSettingsMessage}</span>}
      </div>
      {apiSettingsError && <div className="login-error" style={{ whiteSpace: 'pre-wrap', color: '#b91c1c', fontSize: 14, marginBottom: 14 }}>{apiSettingsError}</div>}
      <div className="row" style={{ gap: 12, marginBottom: 14, alignItems: 'center' }}>
        <button className="ghost-btn" onClick={testProvider} disabled={testingProvider}>
          {testingProvider ? 'Probando conexión…' : 'Probar conexión con Claude'}
        </button>
        {providerTestMessage && <span className="pill" style={{ color: '#166534', borderColor: '#86efac', background: '#f0fdf4' }}>{providerTestMessage}</span>}
      </div>
      {providerTestError && <div className="login-error" style={{ whiteSpace: 'pre-wrap', color: '#b91c1c', fontSize: 14, marginBottom: 14 }}>{providerTestError}</div>}
      <div className="row" style={{ marginBottom: 14 }}>
        <button className="primary-btn" onClick={nuevo}>+ Nuevo tipo</button>
      </div>
      {tipos.sort((a, b) => Number(b.builtin) - Number(a.builtin)).map(t => (
        <div key={t.id} className="list-item">
          <div className="info">
            <div className="name">{t.nombre} {!t.activo && <span className="pill">Desactivado</span>} {!t.builtin && <span className="pill">Personalizado</span>}</div>
            <div className="desc">{t.descripcion || '—'}</div>
          </div>
          <button className="ghost-btn" onClick={() => setEditing(t)}>Editar</button>
          <button className="ghost-btn" onClick={() => toggle(t)}>{t.activo ? 'Desactivar' : 'Activar'}</button>
          <button className="ghost-btn" onClick={() => clone(t)}>Clonar</button>
          {t.builtin && t.promptOriginal && <button className="ghost-btn" onClick={() => restore(t)}>Restaurar</button>}
          {!t.builtin && <button className="ghost-btn" onClick={() => remove(t)}>Eliminar</button>}
        </div>
      ))}
      {editing && <TypeEditor tipo={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}

function TypeEditor({ tipo, onSave, onClose }: { tipo: SermonType; onSave: (t: SermonType) => void; onClose: () => void; }) {
  const [t, setT] = useState<SermonType>(tipo);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  async function test() {
    setTesting(true); setTestResult('');
    try {
      const r = await generateSermon({
        tipo: t,
        variables: { PASAJE: 'Romanos 12:1-2', TEMA: 'La transformación', TEMA_O_PASAJE: 'La transformación', PASAJE_O_TEMA: 'Romanos 12:1-2', OCASION: 'Domingo', TONO: 'pastoral', AUDIENCIA: 'congregación', VELOCIDAD: '130' },
        numPuntos: 3
      });
      setTestResult(`Título: ${r.titulo}\n\n${r.contenidoHTML.replace(/<[^>]+>/g, '').slice(0, 800)}…`);
    } catch (e: any) { setTestResult(`Error: ${e?.message}`); }
    finally { setTesting(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Editar tipo de sermón</h3>
        <div className="field"><label>Nombre</label><input value={t.nombre} onChange={e => setT({ ...t, nombre: e.target.value })} /></div>
        <div className="field"><label>Descripción</label><input value={t.descripcion ?? ''} onChange={e => setT({ ...t, descripcion: e.target.value })} /></div>
        <div className="row" style={{ gap: 12 }}>
          <div className="field" style={{ flex: 1 }}><label>Puntos sugeridos</label><input type="number" min={1} max={20} value={t.puntosSugeridos} onChange={e => setT({ ...t, puntosSugeridos: Number(e.target.value) })} /></div>
          <div className="field" style={{ flex: 1, alignSelf: 'center' }}>
            <label><input type="checkbox" checked={t.incluirTuHistoria} onChange={e => setT({ ...t, incluirTuHistoria: e.target.checked })} /> Incluir "Tu Historia"</label>
          </div>
        </div>
        <div className="field">
          <label>Prompt maestro</label>
          <textarea value={t.prompt} onChange={e => setT({ ...t, prompt: e.target.value })} rows={14} />
          <small style={{ color: 'var(--text-muted)' }}>Variables disponibles: {'{PASAJE}, {TEMA}, {TEMA_O_PASAJE}, {PASAJE_O_TEMA}, {OCASION}, {TONO}, {AUDIENCIA}, {VELOCIDAD}'}</small>
        </div>
        {testResult && <pre style={{ background: 'var(--bg-muted)', padding: 12, borderRadius: 8, maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{testResult}</pre>}
        <div className="modal-actions">
          <button className="ghost-btn" onClick={test} disabled={testing}>{testing ? 'Probando…' : 'Probar prompt'}</button>
          <button className="ghost-btn" onClick={onClose}>Cancelar</button>
          <button className="primary-btn" onClick={() => onSave(t)}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
