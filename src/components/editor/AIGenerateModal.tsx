import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/storage/db';
import { generateSermon, testAIProviderConnection } from '@/ai/aiClient';
import { useAppStore } from '@/store';
import type { Sermon, SermonType } from '@/types';

interface Props {
  sermon: Sermon;
  onClose: () => void;
  onApply: (titulo: string, contenidoHTML: string) => void;
}

function getGenerationValidationError(tipoId: string, pasaje: string, tema: string, ocasion: string): string | null {
  const hasPasaje = !!pasaje.trim();
  const hasTema = !!tema.trim();
  const hasOcasion = !!ocasion.trim();
  const normalizedType = tipoId.trim().toLowerCase();

  if ((normalizedType === 'expositivo' || normalizedType === 'textual') && !hasPasaje) {
    return 'Este tipo de sermón requiere un pasaje bíblico específico.';
  }

  if (normalizedType === 'liturgico' || normalizedType === 'ocasional') {
    if (!hasOcasion && !hasPasaje && !hasTema) {
      return 'Este tipo de sermón requiere una ocasión, un pasaje o un tema de referencia.';
    }
    return null;
  }

  if (normalizedType === 'biografico' && !hasPasaje && !hasTema) {
    return 'El sermón biográfico requiere un personaje bíblico o un pasaje de referencia.';
  }

  if (!hasPasaje && !hasTema && [
    'tematico',
    'doctrinal',
    'deductivo',
    'inductivo',
    'narrativo',
    'evangelistico',
    'devocional',
    'apologetico',
    'profetico',
    'didactico',
    'misiologico'
  ].includes(normalizedType)) {
    return 'Este tipo de sermón requiere al menos un tema o un pasaje de referencia.';
  }

  if (!hasPasaje && !hasTema && !hasOcasion) {
    return 'Escribe al menos un pasaje, un tema o una ocasión antes de generar.';
  }

  return null;
}

export function AIGenerateModal({ sermon, onClose, onApply }: Props) {
  const tipos = useLiveQuery(() => localDB.sermonTypes.filter(t => t.activo).toArray(), []) ?? [];
  const settings = useAppStore(s => s.settings);
  const [tipoId, setTipoId] = useState(sermon.tipo || 'expositivo');
  const [pasaje, setPasaje] = useState(sermon.pasaje || '');
  const [tema, setTema] = useState('');
  const [ocasion, setOcasion] = useState('');
  const [tono, setTono] = useState(sermon.tono || 'pastoral y cercano');
  const [audiencia, setAudiencia] = useState(sermon.audiencia || 'congregación general');
  const [numPuntos, setNumPuntos] = useState('4');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testingProvider, setTestingProvider] = useState(false);
  const [providerTestMessage, setProviderTestMessage] = useState('');
  const [providerTestError, setProviderTestError] = useState('');

  const providerLabel = 'Claude Sonnet';
  const providerCredentialSummary = useMemo(() => {
    return settings.claudeApiKey?.trim()
      ? 'Usando tu API key de Claude.'
      : 'Usando la clave configurada en el servidor o la que tengas en Ajustes.';
  }, [settings.claudeApiKey]);

  useEffect(() => {
    setProviderTestMessage('');
    setProviderTestError('');
  }, [settings.claudeApiKey]);

  async function testProvider() {
    setTestingProvider(true);
    setProviderTestMessage('');
    setProviderTestError('');
    try {
      const result = await testAIProviderConnection();
      setProviderTestMessage(result.message);
    } catch (e: any) {
      setProviderTestError(e?.message ?? 'No se pudo probar la conexión.');
    } finally {
      setTestingProvider(false);
    }
  }

  async function run() {
    const tipo: SermonType | undefined = tipos.find(t => t.id === tipoId);
    if (!tipo) { setError('Tipo no encontrado'); return; }
    const validationError = getGenerationValidationError(tipo.id, pasaje, tema, ocasion);
    if (validationError) { setError(validationError); return; }
    const velocidad = String(sermon.velocidad ?? settings.wordsPerMinute ?? 130);
    setBusy(true); setError(null);
    try {
      console.log('[IA] Generando sermón con IA:', { tipo, pasaje, tema, ocasion, tono, audiencia, velocidad, numPuntos });
      const res = await generateSermon({
        tipo,
        variables: {
          PASAJE: pasaje, TEMA: tema, TEMA_O_PASAJE: tema || pasaje, PASAJE_O_TEMA: pasaje || tema,
          OCASION: ocasion, TONO: tono, AUDIENCIA: audiencia, VELOCIDAD: velocidad
        },
        numPuntos: Number(numPuntos) || tipo.puntosSugeridos
      });
      console.log('[IA] Respuesta IA:', res);
      onApply(res.titulo, res.contenidoHTML);
      onClose();
    } catch (e: any) {
      console.error('[IA] Error al generar:', e);
      setError((e?.message ?? 'Error al generar.') + (e?.stack ? '\n' + e.stack : ''));
    } finally { setBusy(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Generar sermón con IA</h3>
        <div style={{ marginBottom: 14, padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-muted)' }}>
          <div className="row" style={{ gap: 10, alignItems: 'center', marginBottom: 6 }}>
            <strong>{providerLabel}</strong>
            <span className="pill">Proveedor activo</span>
            {providerTestMessage && <span className="pill" style={{ color: '#166534', borderColor: '#86efac', background: '#f0fdf4' }}>Conectado</span>}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 10 }}>{providerCredentialSummary}</div>
          <div className="row" style={{ gap: 10, alignItems: 'center' }}>
            <button className="ghost-btn" onClick={testProvider} disabled={testingProvider || busy}>
              {testingProvider ? 'Probando conexión…' : 'Probar Claude'}
            </button>
            {providerTestMessage && <span style={{ color: '#166534', fontSize: 13 }}>{providerTestMessage}</span>}
          </div>
          {providerTestError && <div className="login-error" style={{ whiteSpace: 'pre-wrap', color: '#b91c1c', fontSize: 13, marginTop: 8 }}>{providerTestError}</div>}
        </div>
        <div className="field">
          <label>Tipo de sermón</label>
          <select value={tipoId} onChange={e => setTipoId(e.target.value)}>
            {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </div>
        <div className="field"><label>Pasaje</label><input value={pasaje} onChange={e => setPasaje(e.target.value)} placeholder="Ej. Romanos 12:1-2" /></div>
        <div className="field"><label>Tema</label><input value={tema} onChange={e => setTema(e.target.value)} placeholder="Ej. La transformación del creyente" /></div>
        <div className="field"><label>Ocasión (sermones litúrgicos)</label><input value={ocasion} onChange={e => setOcasion(e.target.value)} placeholder="Ej. Santa Cena" /></div>
        <div className="row" style={{ gap: 12 }}>
          <div className="field" style={{ flex: 1 }}><label>Tono</label><input value={tono} onChange={e => setTono(e.target.value)} /></div>
          <div className="field" style={{ flex: 1 }}><label>Audiencia</label><input value={audiencia} onChange={e => setAudiencia(e.target.value)} /></div>
        </div>
        <div className="field"><label>Cantidad de puntos</label><input type="number" min={1} max={20} value={numPuntos} onChange={e => setNumPuntos(e.target.value)} /></div>
        {error && <div className="login-error" style={{whiteSpace:'pre-wrap',color:'#b91c1c',fontSize:14}}>{error}</div>}
        <div className="modal-actions">
          <button className="ghost-btn" onClick={onClose}>Cancelar</button>
          <button className="primary-btn" disabled={busy} onClick={run}>{busy ? 'Generando…' : 'Generar'}</button>
        </div>
      </div>
    </div>
  );
}
