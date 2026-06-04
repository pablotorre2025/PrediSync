import type { SermonType } from '@/types';
import { useAppStore } from '@/store';

/**
 * Cliente IA — Claude Sonnet.
 *
 * IMPORTANTE: La API key NUNCA debe vivir en el frontend en producción.
 * Esta función llama a un endpoint proxy `/api/ai/sermon` que en producción debe
 * ser una Cloud Function / Vercel Function / Cloudflare Worker que conoce
 * la API key de Anthropic y reenvía la petición.
 *
 * Para desarrollo, si la variable `VITE_AI_ENDPOINT` no está configurada,
 * el módulo entrega un sermón de demostración (offline) para que el flujo de la
 * app pueda probarse sin clave.
 */

const ENDPOINT = (import.meta as any).env?.VITE_AI_ENDPOINT as string | undefined;
const DEFAULT_ENDPOINT = '/api/ai/sermon';
const AI_FETCH_RETRIES = 2;

export interface AIGenerateInput {
  tipo: SermonType;
  variables: Record<string, string>; // {PASAJE}, {TEMA}, {TONO}, {AUDIENCIA}, {VELOCIDAD}, {OCASION}, ...
  numPuntos?: number;
}

export interface AIGenerateResult {
  titulo: string;
  contenidoHTML: string;
}

export interface AIProviderTestResult {
  ok: boolean;
  provider: string;
  message: string;
}

function getAIConfig() {
  const settings = useAppStore.getState().settings;
  return {
    provider: settings.aiProvider,
    claudeApiKey: settings.claudeApiKey?.trim() ?? ''
  };
}

function extractServerErrorMessage(errorBody: string): string {
  if (!errorBody) return '';

  try {
    const parsed = JSON.parse(errorBody);
    if (typeof parsed?.error === 'string' && parsed.error.trim()) {
      return parsed.error.trim();
    }
  } catch {
    // Ignore invalid JSON bodies and use raw text below.
  }

  return errorBody.trim();
}

function renderPrompt(template: string, vars: Record<string, string>): string {
  return template.replace(/\{([A-Z_]+)\}/g, (_, k) => vars[k] ?? `[${k}]`);
}

function isRetriableStatus(status: number): boolean {
  return status >= 500 || status === 429;
}

function isNetworkFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /Failed to fetch|NetworkError|Load failed|fetch/i.test(error.message);
}

async function postAIEndpoint(payload: unknown): Promise<Response> {
  const endpoint = ENDPOINT ?? DEFAULT_ENDPOINT;
  let lastError: unknown = null;
  let lastResponse: Response | null = null;

  for (let attempt = 1; attempt <= AI_FETCH_RETRIES; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store',
        body: JSON.stringify(payload)
      });

      if (!isRetriableStatus(response.status) || attempt === AI_FETCH_RETRIES) {
        return response;
      }

      lastResponse = response;
    } catch (error) {
      lastError = error;
      if (!isNetworkFetchError(error) || attempt === AI_FETCH_RETRIES) {
        throw error;
      }
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError instanceof Error ? lastError : new Error('No se pudo conectar con el servidor IA.');
}

export async function generateSermon(input: AIGenerateInput): Promise<AIGenerateResult> {
  const prompt = renderPrompt(input.tipo.prompt, input.variables);
  const aiConfig = getAIConfig();

  if (aiConfig.provider === 'claude' && !aiConfig.claudeApiKey && ENDPOINT) {
    // Allow server-side env fallback in deployed setups.
  }

  if (!ENDPOINT) {
    console.warn('VITE_AI_ENDPOINT no configurado. Intentando usar la ruta local /api/ai/sermon. Si no existe, se usará el modo de demostración.');
  }

  let res: Response;
  try {
    res = await postAIEndpoint({
      prompt,
      pasaje: input.variables.PASAJE ?? '',
      tema: input.variables.TEMA ?? '',
      ocasion: input.variables.OCASION ?? '',
      provider: aiConfig.provider,
      claudeApiKey: aiConfig.claudeApiKey,
      tipoId: input.tipo.id,
      numPuntos: input.numPuntos ?? input.tipo.puntosSugeridos,
      incluirTuHistoria: !!input.tipo.incluirTuHistoria
    });
  } catch (error) {
    if (!ENDPOINT) {
      return mockGenerate(input, prompt);
    }
    throw new Error('No se pudo conectar con el servidor IA. Intenta de nuevo en unos segundos.');
  }

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    if (!ENDPOINT) {
      // Offline/demo fallback when no IA proxy is configured.
      return mockGenerate(input, prompt);
    }
    const message = extractServerErrorMessage(errorBody);
    throw new Error(message || `Servidor IA error ${res.status}`);
  }

  const data = await res.json();
  return {
    titulo: data.titulo ?? 'Sermón generado',
    contenidoHTML: data.contenidoHTML ?? data.html ?? ''
  };
}

export async function testAIProviderConnection(): Promise<AIProviderTestResult> {
  const aiConfig = getAIConfig();

  if (aiConfig.provider === 'claude' && !aiConfig.claudeApiKey && !ENDPOINT) {
    throw new Error('Configura la ruta del servidor IA o pega tu API key de Claude antes de probar la conexión.');
  }

  let res: Response;
  try {
    res = await postAIEndpoint({
      action: 'test-provider',
      provider: aiConfig.provider,
      claudeApiKey: aiConfig.claudeApiKey
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor IA para probar la conexión.');
  }

  const rawBody = await res.text().catch(() => '');
  if (!res.ok) {
    const message = extractServerErrorMessage(rawBody);
    throw new Error(message || `Servidor IA error ${res.status}`);
  }

  let data: any = {};
  try {
    data = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    data = { message: rawBody };
  }

  return {
    ok: !!data.ok,
    provider: data.provider ?? aiConfig.provider,
    message: data.message ?? 'Conexión verificada.'
  };
}

function mockGenerate(input: AIGenerateInput, prompt: string): AIGenerateResult {
  const vars = input.variables;
  const tema = vars.TEMA || vars.PASAJE || vars.TEMA_O_PASAJE || vars.PASAJE_O_TEMA || vars.OCASION || 'la fidelidad de Dios';
  const num = input.numPuntos ?? input.tipo.puntosSugeridos ?? 4;
  const puntos = Array.from({ length: num }, (_, i) => i + 1);

  const block = (labelId: string, label: string, color: string, titulo: string, texto: string) =>
    `<div class="smart-block" data-label-id="${labelId}" data-label="${label.toLowerCase()}" data-color="${color}" data-titulo="${titulo}" style="--label-color:${color}">` +
    `<div class="smart-block-header" contenteditable="false">${titulo ? `${label} — ${titulo}` : label}</div>` +
    `<div class="smart-block-body"><p>${texto}</p></div></div>`;

  let html = '';
  html += block('introduccion', 'Introducción', '#6b8e6e', '', `Hoy vamos a abrir nuestro corazón al tema: <strong>${tema}</strong>. Dios tiene una palabra fresca y poderosa para nosotros.`);
  html += block('texto-base', 'Texto base', '#4a6fa5', '', vars.PASAJE || 'Pasaje principal a definir.');
  html += block('contexto-historico', 'Contexto histórico', '#65a30d', '', 'Breve contexto histórico, literario y teológico para situar al oyente.');

  for (const i of puntos) {
    html += block('punto', 'Punto', '#8a2f2a', `Punto ${i}`, `Desarrollo bíblico del punto ${i} sobre ${tema}. Explicación clara, pastoral y con profundidad.`);
    html += block('ilustracion', 'Ilustración', '#d97706', '', `Ilustración de vida real que conecta el punto ${i} con la audiencia.`);
    html += block('aplicacion', 'Aplicación', '#2563eb', '', `Aplicación práctica y concreta para esta semana.`);
    if (input.tipo.incluirTuHistoria) {
      html += block('tu-historia', 'Tu Historia', '#c2410c', '',
        `<em>Sugerencia IA:</em> Comparte una experiencia personal donde Dios te enseñó sobre ${tema} (categorías sugeridas: Familia, Ministerio, Crisis, Restauración).`);
    }
  }

  html += block('conclusion', 'Conclusión', '#475569', '', `En resumen: ${tema} es una invitación de Dios a vivir transformados.`);
  html += block('llamado', 'Llamado', '#be123c', '', 'Hoy quiero invitarte a responder con todo tu corazón.');
  html += block('oracion', 'Oración', '#7c3aed', '', 'Señor, gracias por tu Palabra. Escribe esta verdad en lo profundo de nuestro corazón. En el nombre de Jesús, amén.');

  // Bloque inicial con el prompt para referencia (oculto en predicación)
  const debug = `<p><em style="opacity:.4">Generado en modo demo (sin servidor IA). Configura VITE_AI_ENDPOINT para usar Claude Sonnet.</em></p>`;

  return {
    titulo: `Sermón sobre ${tema}`,
    contenidoHTML: debug + html
  };
}
