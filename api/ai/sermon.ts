/**
 * Vercel API route — POST /api/ai/sermon
 *
 * Variables de entorno requeridas:
 *   ANTHROPIC_API_KEY=sk-ant-...
 *   ANTHROPIC_MODEL=claude-sonnet-4-20250514   (opcional)
 *   ALLOWED_ORIGIN=https://tu-pwa.app          (opcional, por defecto *)
 */

// Tipos mínimos para evitar dependencia explícita de `@vercel/node`.
type VercelRequest = { method?: string; body?: any; headers: Record<string, string | string[] | undefined> };
type VercelResponse = {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string): VercelResponse;
  json(body: unknown): void;
  send(body: unknown): void;
  end(): void;
};

type AIProvider = 'claude';

type ProviderGenerationConfig = {
  initialMaxTokens: number;
  retryMaxTokens: number;
  pointMaxTokens: number;
  closingMaxTokens: number;
  compactInstruction: string;
};

const DEFAULT_ALLOWED_ORIGINS = [
  'https://sermon-maker-pro.web.app',
  'https://sermon-maker-pro.firebaseapp.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173'
];

const SYSTEM_PROMPT = `Eres un asistente experto en redactar sermones cristianos profundamente bíblicos, pastorales, emocionalmente poderosos y estructuralmente profesionales. SIEMPRE devuelves la respuesta en JSON estricto con la forma { "titulo": string, "blocks": SermonBlock[] }, sin texto adicional ni cercas de código.

Cada SermonBlock debe usar esta forma exacta:
{
  "id": string,
  "label": string,
  "color": string,
  "titulo": string,
  "paragraphs": string[]
}

IDs y colores estándar:
- introduccion #6b8e6e
- texto-base #4a6fa5
- contexto-historico #65a30d
- punto #8a2f2a
- ilustracion #d97706
- aplicacion #2563eb
- llamado #be123c
- conclusion #475569
- oracion #7c3aed
- tu-historia #c2410c

Reglas:
- Si el usuario lo pide, incluye un bloque "Tu Historia" después de cada Punto, con sugerencia, categorías y un ejemplo IA.
- No uses markdown ni HTML; devuelve solo JSON con blocks.
- Genera el número de puntos solicitado (puede ser >4).
- Aumenta el material en todas las secciones: introducción, contexto histórico, puntos, aplicaciones, ilustraciones, conclusión y llamado.
- Incluye transiciones claras.
- No añadas bloques extra fuera de los requeridos.
- Cada bloque debe ser sustantivo y útil, pero claro y bien estructurado.
- Nunca repitas el nombre de la sección dentro de "titulo" ni al comienzo del primer párrafo.
- En texto-base, usa el pasaje base literal como referencia central y no añadas explicación expositiva en ese bloque.
- Guía de longitud: introducción 2 párrafos, contexto histórico 2 párrafos, texto base 1 párrafo, cada punto 2 párrafos, cada aplicación 1 párrafo sólido, cada ilustración 1 párrafo sólido, cada bloque Tu Historia 1 párrafo sólido, conclusión 1 párrafo, llamado 1 párrafo, oración 1 párrafo.
- Usa exactamente una introducción, un contexto histórico, un texto base, __NUM_PUNTOS__ puntos, una aplicación por punto, una ilustración por punto, y solo un bloque Tu Historia por punto cuando se solicite.
- Mantén el sermón completo en un tamaño amplio pero razonable para responder rápido en una llamada síncrona.
- Sé pastoralmente cálido, bíblicamente sólido y emocionalmente poderoso.
- Prioriza profundidad y desarrollo real en cada sección.`;

function getInputValidationError(tipoId: string, pasajeBase: string, tema: string, ocasion: string, userPrompt: string): string | null {
  const normalizedType = String(tipoId || '').trim().toLowerCase();
  const hasPasaje = !!pasajeBase.trim();
  const hasTema = !!tema.trim();
  const hasOcasion = !!ocasion.trim();
  const hasPrompt = !!userPrompt.trim();

  if (!hasPrompt) return 'Falta prompt';
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

function getProvider(_body: any): AIProvider {
  return 'claude';
}

function getProviderCredentials(_provider: AIProvider, body: any) {
  return {
    apiKey: String(body?.claudeApiKey ?? '').trim() || process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'
  };
}

function getAction(body: any): string {
  return String(body?.action ?? '').trim().toLowerCase();
}

async function callProvider(_provider: AIProvider, apiKey: string, model: string, system: string, user: string, maxTokens: number) {
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }]
    })
  });
}

async function handleProviderTest(res: VercelResponse, provider: AIProvider, apiKey: string, model: string) {
  const system = 'Eres un asistente breve. Responde en una sola línea, en español, confirmando que la conexión funciona para Sermon Maker Pro.';
  const user = 'Haz una micro conversación de verificación. Primero saluda brevemente y luego confirma que el acceso al proveedor está activo.';
  const resp = await callProvider(provider, apiKey, model, system, user, 120);

  if (!resp.ok) {
    const text = await resp.text();
    res.status(resp.status).json({ error: 'Anthropic API error', detail: text });
    return;
  }

  const data = await resp.json() as any;
  const message = extractAnthropicText(data);
  res.status(200).json({
    ok: true,
    provider,
    message: message || `Conexión con Claude verificada.`
  });
}

function getProviderGenerationConfig(_provider: AIProvider, numPuntos: number, _incluirTuHistoria: boolean): ProviderGenerationConfig {
  return {
    initialMaxTokens: Math.min(5200, 2400 + (numPuntos * 450)),
    retryMaxTokens: 2600,
    pointMaxTokens: 900,
    closingMaxTokens: 1400,
    compactInstruction: '- Puedes desarrollar con amplitud pastoral normal, manteniendo un sermón rico y completo.'
  };
}

async function generateRichHTMLFallback(
  provider: AIProvider,
  apiKey: string,
  model: string,
  userPrompt: string,
  pasajeBase: string,
  numPuntos: number,
  incluirTuHistoria: boolean
) {
  const system = [
    'Eres un redactor pastoral experto.',
    'Devuelve SOLO un fragmento HTML editable y profesional, sin JSON, sin markdown y sin cercas de código.',
    'Usa únicamente estas etiquetas cuando sean necesarias: h1, h2, h3, p, strong, em, ul, ol, li, blockquote, hr, br.',
    'La salida debe funcionar bien como una sola hoja larga para lectura y predicación.',
    'No uses smart labels ni bloques técnicos.'
  ].join(' ');

  const generationConfig = getProviderGenerationConfig(provider, numPuntos, incluirTuHistoria);

  const basePrompt = `${userPrompt}

INSTRUCCIONES DE FORMATO:
- Escribe el sermón como documento continuo, hermoso, claro y editable.
- Comienza con un <h1> para el título del sermón.
- Si hay pasaje base, colócalo al inicio en un <p><strong>Texto base:</strong> ...</p>.
- Usa <h2> para secciones principales y <h3> cuando haga falta subdividir.
- Usa párrafos amplios, listas cuando ayuden y <blockquote> para citas o frases clave.
- Incluye obligatoriamente, en este orden general: Introducción, Contexto bíblico o histórico, Texto base, ${Array.from({ length: numPuntos }, (_, index) => `Punto ${index + 1}`).join(', ')}, Conclusión, Llamado y Oración final.
- Número de puntos requerido: ${numPuntos}.
- Incluir “Tu Historia”: ${incluirTuHistoria ? 'sí, de forma natural dentro del documento.' : 'no.'}
- Pasaje base literal: ${pasajeBase || 'no especificado'}.
- No termines el sermón antes de escribir la oración final.
- ${generationConfig.compactInstruction}`;

  const user = `${basePrompt}
- No devuelvas explicación sobre el formato. Devuelve solo el HTML.`;

  const resp = await callProvider(provider, apiKey, model, system, user, generationConfig.initialMaxTokens);
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`Claude fallback error: ${detail}`);
  }

  const data = await resp.json() as any;
  const raw = extractAnthropicText(data);
  let contenidoHTML = renderRichDocumentHTML(raw, pasajeBase);

  if (!hasRenderableCoreSermon(contenidoHTML, numPuntos)) {
    const retryPrompt = `${basePrompt}
- La respuesta anterior quedó incompleta o demasiado corta.
- Reintenta el sermón completo desde el inicio.
- Debes incluir explícitamente Introducción, Contexto bíblico o histórico, Texto base, todos los puntos solicitados, Conclusión, Llamado y Oración final.
- Si necesitas acortar, resume cada sección, pero no omitas ninguna.`;
    const retryResp = await callProvider(provider, apiKey, model, system, retryPrompt, generationConfig.retryMaxTokens);
    if (retryResp.ok) {
      const retryData = await retryResp.json() as any;
      const retryRaw = extractAnthropicText(retryData);
      const retryHTML = renderRichDocumentHTML(retryRaw, pasajeBase);
      if (hasRenderableCoreSermon(retryHTML, numPuntos)) {
        contenidoHTML = retryHTML;
      }
    }
  }

  if (findMissingPointNumbers(contenidoHTML, numPuntos).length > 0) {
    contenidoHTML = await appendMissingPointSections(
      provider,
      apiKey,
      model,
      userPrompt,
      pasajeBase,
      contenidoHTML,
      numPuntos,
      generationConfig.closingMaxTokens
    );
  }

  if (findMissingClosingSections(contenidoHTML).length > 0) {
    contenidoHTML = await appendMissingClosingSections(provider, apiKey, model, userPrompt, pasajeBase, contenidoHTML, generationConfig.closingMaxTokens);
  }

  const titulo = extractHTMLTitle(contenidoHTML) || pasajeBase || 'Sermón generado';

  return { titulo, contenidoHTML };
}

async function appendMissingClosingSections(
  provider: AIProvider,
  apiKey: string,
  model: string,
  userPrompt: string,
  pasajeBase: string,
  existingHTML: string,
  maxTokens: number
) {
  const missing = findMissingClosingSections(existingHTML);
  if (missing.length === 0) return existingHTML;

  const system = 'Devuelve SOLO HTML editable. Completa únicamente las secciones finales faltantes de un sermón ya iniciado.';
  const user = `${userPrompt}

Ya existe este sermón en HTML, pero faltan estas secciones finales: ${missing.join(', ')}.
Pasaje base: ${pasajeBase || 'no especificado'}.
Devuelve solo las secciones faltantes en HTML usando <h2> y <p>. No repitas el contenido ya escrito. Debes cerrar el sermón con la oración final.`;

  const resp = await callProvider(provider, apiKey, model, system, user, maxTokens);
  if (!resp.ok) return existingHTML;

  const data = await resp.json() as any;
  const raw = extractAnthropicText(data);
  const extraHTML = renderRichDocumentHTML(raw, '');
  const trimmedExtra = extraHTML.replace(/^<h1>[\s\S]*?<\/h1>/i, '').trim();
  return `${existingHTML}${trimmedExtra}`;
}

function findMissingClosingSections(html: string): string[] {
  const missing: string[] = [];
  if (!/Conclusión|Conclusi[oó]n/i.test(html)) missing.push('Conclusión');
  if (!/Llamado/i.test(html)) missing.push('Llamado');
  if (!/Oración|Oracion/i.test(html)) missing.push('Oración final');
  return missing;
}

function extractGeneratedPointNumbers(html: string): number[] {
  const text = html.replace(/<[^>]+>/g, ' ');
  const found = new Set<number>();

  for (const match of text.matchAll(/Punto\s+(\d+)/gi)) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > 0) found.add(value);
  }

  for (const match of text.matchAll(/(?:^|\s)(\d{1,2})\.\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]/g)) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > 0) found.add(value);
  }

  const ordinalMap: Array<[RegExp, number]> = [
    [/Primer\s+punto|Punto\s+primero/gi, 1],
    [/Segundo\s+punto|Punto\s+segundo/gi, 2],
    [/Tercer\s+punto|Punto\s+tercero/gi, 3],
    [/Cuarto\s+punto|Punto\s+cuarto/gi, 4],
    [/Quinto\s+punto|Punto\s+quinto/gi, 5],
    [/Sexto\s+punto|Punto\s+sexto/gi, 6],
    [/S[eé]ptimo\s+punto|Punto\s+s[eé]ptimo/gi, 7],
    [/Octavo\s+punto|Punto\s+octavo/gi, 8],
    [/Noveno\s+punto|Punto\s+noveno/gi, 9],
    [/D[eé]cimo\s+punto|Punto\s+d[eé]cimo/gi, 10]
  ];

  for (const [pattern, value] of ordinalMap) {
    if (pattern.test(text)) found.add(value);
  }

  return Array.from(found).sort((a, b) => a - b);
}

function findMissingPointNumbers(html: string, numPuntos: number): number[] {
  const existing = new Set(extractGeneratedPointNumbers(html));
  const missing: number[] = [];
  for (let point = 1; point <= numPuntos; point += 1) {
    if (!existing.has(point)) missing.push(point);
  }
  return missing;
}

async function appendMissingPointSections(
  provider: AIProvider,
  apiKey: string,
  model: string,
  userPrompt: string,
  pasajeBase: string,
  existingHTML: string,
  numPuntos: number,
  maxTokens: number
) {
  let currentHTML = existingHTML;
  const system = 'Devuelve SOLO HTML editable. Completa únicamente un punto faltante de un sermón ya iniciado.';

  for (const pointNumber of findMissingPointNumbers(currentHTML, numPuntos)) {
    const { mainHTML, closingHTML } = splitClosingSections(currentHTML);
    const user = `${userPrompt}

Ya existe este sermón en HTML, pero falta el Punto ${pointNumber}.
Pasaje base: ${pasajeBase || 'no especificado'}.
Devuelve solo el Punto ${pointNumber}, usando exactamente un <h2> con el título "Punto ${pointNumber}" y luego sus párrafos en <p>.
No repitas Introducción, Contexto, Texto base, otros puntos ni Conclusión.`;

    const resp = await callProvider(provider, apiKey, model, system, user, Math.min(maxTokens, 450));
    if (!resp.ok) continue;

    const data = await resp.json() as any;
    const raw = extractAnthropicText(data);
    const extraHTML = renderRichDocumentHTML(raw, '');
    if (isRenderFailureHTML(extraHTML)) continue;

    const extraBody = normalizePointSectionHTML(extraHTML, pointNumber);
    if (!extraBody) continue;

    currentHTML = `${mainHTML}${extraBody}${closingHTML}`;
  }

  return currentHTML;
}

function splitClosingSections(html: string): { mainHTML: string; closingHTML: string } {
  const match = html.match(/<h[23][^>]*>\s*(Conclusión|Conclusi[oó]n|Llamado|Oración|Oracion)[\s\S]*$/i);
  if (!match || match.index == null) {
    return { mainHTML: html, closingHTML: '' };
  }

  return {
    mainHTML: html.slice(0, match.index),
    closingHTML: html.slice(match.index)
  };
}

function hasRenderableCoreSermon(html: string, numPuntos: number): boolean {
  if (!html || /No fue posible renderizar el contenido generado/i.test(html)) return false;

  const hasIntroduction = /Introducción/i.test(html);
  const hasContext = /Contexto/i.test(html);
  const pointNumbers = extractGeneratedPointNumbers(html);
  const paragraphCount = (html.match(/<p>/gi) ?? []).length;

  return hasIntroduction
    && hasContext
    && pointNumbers.length >= numPuntos
    && paragraphCount >= Math.max(5, numPuntos + 2);
}

function isRenderFailureHTML(html: string): boolean {
  return /No fue posible renderizar el contenido generado/i.test(html);
}

function containsPointNumber(html: string, pointNumber: number): boolean {
  const text = html.replace(/<[^>]+>/g, ' ');
  return new RegExp(`(?:Punto\\s+${pointNumber}|(?:^|\\s)${pointNumber}\\.\\s+)`, 'i').test(text);
}

function hasMeaningfulPointContent(html: string): boolean {
  if (!html || isRenderFailureHTML(html)) return false;

  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length < 200) return false;

  const blockCount = (html.match(/<(p|ul|ol|blockquote)\b/gi) ?? []).length;
  return blockCount >= 2;
}

function normalizePointSectionHTML(html: string, pointNumber: number): string {
  const trimmed = splitClosingSections(stripTopLevelTitle(html).trim()).mainHTML.trim();
  if (!trimmed) return '';

  const bodyWithoutFirstHeading = trimmed.replace(/^\s*<h[23][^>]*>[\s\S]*?<\/h[23]>\s*/i, '').trim();
  const body = bodyWithoutFirstHeading || trimmed;
  if (!hasMeaningfulPointContent(body)) return '';

  return `<h2>Punto ${pointNumber}</h2>${body}`;
}

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, '');
}

function resolveAllowedOrigin(req: VercelRequest): string {
  const requestOrigin = typeof req.headers.origin === 'string' ? normalizeOrigin(req.headers.origin) : '';
  const configuredOrigins = String(process.env.ALLOWED_ORIGIN ?? '')
    .split(',')
    .map(origin => normalizeOrigin(origin))
    .filter(Boolean);

  if (configuredOrigins.includes('*')) {
    return requestOrigin || '*';
  }

  const allowlist = new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins]);
  if (requestOrigin && allowlist.has(requestOrigin)) {
    return requestOrigin;
  }

  return configuredOrigins[0] || DEFAULT_ALLOWED_ORIGINS[0];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const origin = resolveAllowedOrigin(req);
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Vary', 'Origin');

    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {};
    const action = getAction(body);
    const provider = getProvider(body);
    const { apiKey, model } = getProviderCredentials(provider, body);
    if (!apiKey) {
      res.status(400).json({
        error: 'Falta la API key de Claude. Pégala en Ajustes > IA y tipos de sermón o configura ANTHROPIC_API_KEY.'
      });
      return;
    }

    if (action === 'test-provider') {
      await handleProviderTest(res, provider, apiKey, model);
      return;
    }

    const userPrompt: string = body.prompt ?? '';
    const pasajeBase: string = String(body.pasaje ?? '').trim();
    const tema: string = String(body.tema ?? '').trim();
    const ocasion: string = String(body.ocasion ?? '').trim();
    const tipoId: string = String(body.tipoId ?? '').trim();
    const numPuntos: number = Number(body.numPuntos) || 4;
    const incluirTuHistoria: boolean = !!body.incluirTuHistoria;
    const validationError = getInputValidationError(tipoId, pasajeBase, tema, ocasion, userPrompt);
    if (validationError) { res.status(400).json({ error: validationError }); return; }

    const sermon = await generateRichHTMLFallback(
      provider,
      apiKey,
      model,
      userPrompt,
      pasajeBase,
      numPuntos,
      incluirTuHistoria
    );
    res.status(200).json(sermon);
  } catch (e: any) {
    console.error('AI sermon handler error:', e);
    res.status(500).json({ error: e?.message ?? 'Error interno' });
  }
}

function extractAnthropicText(data: any): string {
  if (!data) return '';
  if (typeof data === 'string') return data.trim();
  if (typeof data.completion === 'string') return data.completion.trim();
  if (typeof data.output === 'string') return data.output.trim();
  if (Array.isArray(data.content) && typeof data.content[0]?.text === 'string') return data.content[0].text.trim();
  if (Array.isArray(data?.output?.[0]?.content) && typeof data.output[0].content[0]?.text === 'string') return data.output[0].content[0].text.trim();
  return '';
}

function getClarificationError(text: string): string | null {
  if (!text) return null;

  if (/no veo el pasaje b[ií]blico especificado|necesito que indiques claramente.*pasaje b[ií]blico/i.test(text)) {
    return 'Este tipo de sermón requiere un pasaje bíblico específico.';
  }

  if (/necesito.*tema|falta.*tema|especifica.*tema/i.test(text) && !/pasaje/i.test(text)) {
    return 'Este tipo de sermón requiere al menos un tema o un pasaje de referencia.';
  }

  return null;
}

function parseAnthropicJSON(text: string): any | null {
  if (!text) return null;

  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim();

  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd < 0 || jsonEnd < jsonStart) return null;

  try {
    return JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
  } catch {
    return null;
  }
}

function recoverPartialAnthropicJSON(text: string): any | null {
  if (!text) return null;

  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim();

  const titleMatch = cleaned.match(/"titulo"\s*:\s*"((?:\\.|[^"\\])*)"/);
  const title = titleMatch ? decodeJSONString(titleMatch[1]) : 'Sermón generado';

  const blocksKey = cleaned.indexOf('"blocks"');
  if (blocksKey < 0) return null;
  const arrayStart = cleaned.indexOf('[', blocksKey);
  if (arrayStart < 0) return null;

  const blocks: any[] = [];
  let depth = 0;
  let inString = false;
  let escaping = false;
  let blockStart = -1;

  for (let index = arrayStart + 1; index < cleaned.length; index += 1) {
    const char = cleaned[index];

    if (inString) {
      if (escaping) {
        escaping = false;
      } else if (char === '\\') {
        escaping = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      if (depth === 0) blockStart = index;
      depth += 1;
      continue;
    }

    if (char === '}') {
      if (depth === 0) continue;
      depth -= 1;
      if (depth === 0 && blockStart >= 0) {
        const fragment = cleaned.slice(blockStart, index + 1);
        try {
          blocks.push(JSON.parse(fragment));
        } catch {
          // Ignore incomplete trailing block fragments.
        }
        blockStart = -1;
      }
    }
  }

  if (blocks.length === 0) return null;
  return { titulo: title, blocks };
}

function decodeJSONString(value: string): string {
  try {
    return JSON.parse(`"${value}"`);
  } catch {
    return value;
  }
}

function renderSermonHTML(parsed: any, pasajeBase = ''): string {
  if (typeof parsed?.contenidoHTML === 'string' && parsed.contenidoHTML.trim()) {
    return parsed.contenidoHTML;
  }

  if (!Array.isArray(parsed?.blocks) || parsed.blocks.length === 0) {
    return '';
  }

  const blocks = parsed.blocks
    .map((block: any) => sanitizeBlock(block, pasajeBase))
    .filter(Boolean);

  return renderProfessionalDocumentHTML(parsed?.titulo, blocks, pasajeBase);
}

function renderProfessionalDocumentHTML(rawTitle: unknown, blocks: any[], pasajeBase = ''): string {
  const title = String(rawTitle ?? '').trim() || extractDocumentTitleFromBlocks(blocks) || 'Sermón generado';
  const normalizedBlocks = dedupeDocumentBlocks(blocks);
  const parts: string[] = [`<h1>${escapeHtml(title)}</h1>`];

  const explicitTextBase = normalizedBlocks.find(block => block.id === 'texto-base');
  if (pasajeBase && !explicitTextBase) {
    parts.push(`<blockquote><strong>Texto base:</strong> ${escapeHtml(pasajeBase)}</blockquote>`);
  }

  for (const block of normalizedBlocks) {
    const rendered = renderDocumentBlock(block);
    if (rendered) parts.push(rendered);
  }

  return parts.join('');
}

function dedupeDocumentBlocks(blocks: any[]): any[] {
  const singletonIds = new Set(['introduccion', 'texto-base', 'contexto-historico', 'conclusion', 'llamado', 'oracion']);
  const seenSingletons = new Set<string>();

  return blocks.filter((block: any) => {
    const id = String(block?.id ?? '').trim();
    if (!singletonIds.has(id)) return true;
    if (seenSingletons.has(id)) return false;
    seenSingletons.add(id);
    return true;
  });
}

function extractDocumentTitleFromBlocks(blocks: any[]): string {
  const point = blocks.find(block => String(block?.id ?? '').trim() === 'punto' && String(block?.titulo ?? '').trim());
  return String(point?.titulo ?? '').trim();
}

function renderDocumentBlock(block: any): string {
  const id = String(block?.id ?? '').trim();
  const label = String(block?.label ?? defaultLabelForId(id)).trim() || defaultLabelForId(id);
  const title = String(block?.titulo ?? '').trim();
  const paragraphs = Array.isArray(block?.paragraphs)
    ? block.paragraphs.map((paragraph: unknown) => String(paragraph ?? '').trim()).filter(Boolean)
    : [];

  if (!paragraphs.length && id !== 'texto-base') return '';

  if (id === 'texto-base') {
    const text = paragraphs[0] || 'Pasaje base no especificado.';
    return `<blockquote><strong>Texto base:</strong> ${escapeHtml(text)}</blockquote>`;
  }

  const headingTag = id === 'punto' ? 'h2' : (id === 'ilustracion' || id === 'aplicacion' || id === 'tu-historia' ? 'h3' : 'h2');
  const heading = title || label;
  const body = paragraphs.map((paragraph: string) => renderDocumentParagraph(paragraph)).join('');

  if (!heading && !body) return '';
  return `<${headingTag}>${escapeHtml(heading)}</${headingTag}>${body}`;
}

function renderDocumentParagraph(paragraph: string): string {
  const trimmed = paragraph.trim();
  if (!trimmed) return '';

  if (/^[-*•]\s+/m.test(trimmed) || /^\d+[.)]\s+/m.test(trimmed)) {
    return convertStructuredTextToHTML(trimmed);
  }

  if (/^>\s+/.test(trimmed)) {
    return `<blockquote>${formatInlineText(trimmed.replace(/^>\s+/, ''))}</blockquote>`;
  }

  return `<p>${formatInlineText(trimmed)}</p>`;
}

function renderRichDocumentHTML(raw: string, pasajeBase = ''): string {
  const cleaned = String(raw ?? '')
    .replace(/```html\s*/gi, '')
    .replace(/```markdown\s*/gi, '')
    .replace(/```/g, '')
    .trim();

  if (!cleaned) {
    return `<h1>Sermón generado</h1>${pasajeBase ? `<p><strong>Texto base:</strong> ${escapeHtml(pasajeBase)}</p>` : ''}<p>No fue posible renderizar el contenido generado.</p>`;
  }

  if (/<\s*(h1|h2|h3|p|ul|ol|li|blockquote|hr|br)\b/i.test(cleaned)) {
    return sanitizeGeneratedHTML(cleaned, pasajeBase);
  }

  return convertStructuredTextToHTML(cleaned, pasajeBase);
}

function renderRichDocumentHTMLOrEmpty(raw: string, pasajeBase = ''): string {
  const cleaned = String(raw ?? '')
    .replace(/```html\s*/gi, '')
    .replace(/```markdown\s*/gi, '')
    .replace(/```/g, '')
    .trim();

  if (!cleaned) return '';

  if (/<\s*(h1|h2|h3|p|ul|ol|li|blockquote|hr|br)\b/i.test(cleaned)) {
    return sanitizeGeneratedHTML(cleaned, pasajeBase);
  }

  return convertStructuredTextToHTML(cleaned, pasajeBase);
}

function sanitizeGeneratedHTML(html: string, pasajeBase = ''): string {
  const cleaned = html
    .replace(/<\/?(?:html|body|head)[^>]*>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\s(href|src)\s*=\s*(['"])javascript:.*?\2/gi, '');

  const withPassage = pasajeBase && !/Texto base:/i.test(cleaned)
    ? `<p><strong>Texto base:</strong> ${escapeHtml(pasajeBase)}</p>${cleaned}`
    : cleaned;

  return withPassage.trim();
}

function convertStructuredTextToHTML(text: string, pasajeBase = ''): string {
  const lines = text.split(/\r?\n/);
  const parts: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let listTag: 'ul' | 'ol' | null = null;

  function flushParagraph() {
    if (!paragraph.length) return;
    parts.push(`<p>${formatInlineText(paragraph.join(' '))}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!listItems.length || !listTag) return;
    parts.push(`<${listTag}>${listItems.map(item => `<li>${formatInlineText(item)}</li>`).join('')}</${listTag}>`);
    listItems = [];
    listTag = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = Math.min(headingMatch[1].length + 1, 3);
      parts.push(`<h${level}>${formatInlineText(headingMatch[2])}</h${level}>`);
      continue;
    }

    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      if (listTag !== 'ul') flushList();
      listTag = 'ul';
      listItems.push(bulletMatch[1]);
      continue;
    }

    const orderedMatch = line.match(/^\d+[.)]\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph();
      if (listTag !== 'ol') flushList();
      listTag = 'ol';
      listItems.push(orderedMatch[1]);
      continue;
    }

    if (/^>\s+/.test(line)) {
      flushParagraph();
      flushList();
      parts.push(`<blockquote>${formatInlineText(line.replace(/^>\s+/, ''))}</blockquote>`);
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  const title = parts[0]?.startsWith('<h1>') ? '' : '<h1>Sermón generado</h1>';
  const passage = pasajeBase ? `<p><strong>Texto base:</strong> ${escapeHtml(pasajeBase)}</p>` : '';
  return `${title}${passage}${parts.join('')}`;
}

function extractHTMLTitle(html: string): string {
  const match = html.match(/<h1>([\s\S]*?)<\/h1>/i) || html.match(/<h2>([\s\S]*?)<\/h2>/i);
  if (!match) return '';
  return match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function stripTopLevelTitle(html: string): string {
  return html.replace(/^\s*<h1>[\s\S]*?<\/h1>/i, '').trim();
}

function ensureSingleTitle(html: string, title: string): string {
  const body = stripTopLevelTitle(html);
  return `<h1>${escapeHtml(title)}</h1>${body}`;
}

function formatInlineText(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>');
}

function sanitizeBlock(block: any, pasajeBase: string) {
  const id = String(block?.id ?? '').trim();
  const label = String(block?.label ?? defaultLabelForId(id)).trim() || defaultLabelForId(id);
  const rawTitle = String(block?.titulo ?? '').trim();
  const title = stripHeadingPrefix(rawTitle, label, id);
  let paragraphs = Array.isArray(block?.paragraphs)
    ? block.paragraphs.map((paragraph: unknown) => String(paragraph ?? '').trim()).filter(Boolean)
    : [];

  paragraphs = paragraphs
    .map((paragraph: string, index: number) => stripParagraphPrefix(paragraph, index === 0 ? rawTitle : title, label, id))
    .filter(Boolean);

  if (id === 'texto-base') {
    return {
      ...block,
      id,
      label: defaultLabelForId(id),
      color: String(block?.color ?? defaultColorForId(id)),
      titulo: '',
      paragraphs: [pasajeBase || paragraphs[0] || 'Pasaje base no especificado.']
    };
  }

  return {
    ...block,
    id,
    label,
    color: String(block?.color ?? defaultColorForId(id)),
    titulo: title,
    paragraphs
  };
}

function defaultColorForId(id: string): string {
  const colors: Record<string, string> = {
    introduccion: '#6b8e6e',
    'texto-base': '#4a6fa5',
    'contexto-historico': '#65a30d',
    punto: '#8a2f2a',
    ilustracion: '#d97706',
    aplicacion: '#2563eb',
    llamado: '#be123c',
    conclusion: '#475569',
    oracion: '#7c3aed',
    'tu-historia': '#c2410c'
  };
  return colors[id] ?? '#475569';
}

function defaultLabelForId(id: string): string {
  const labels: Record<string, string> = {
    introduccion: 'Introducción',
    'texto-base': 'Texto base',
    'contexto-historico': 'Contexto histórico',
    punto: 'Punto',
    ilustracion: 'Ilustración',
    aplicacion: 'Aplicación',
    llamado: 'Llamado',
    conclusion: 'Conclusión',
    oracion: 'Oración',
    'tu-historia': 'Tu Historia'
  };
  return labels[id] ?? id;
}

function stripHeadingPrefix(value: string, label: string, id: string): string {
  let result = value.trim();
  const candidates = [label, defaultLabelForId(id)].filter(Boolean);

  for (const candidate of candidates) {
    const escaped = escapeRegExp(candidate);
    result = result.replace(new RegExp(`^${escaped}\s*(?:[—:-]\s*)+`, 'i'), '').trim();
  }

  return result;
}

function stripParagraphPrefix(value: string, title: string, label: string, id: string): string {
  let result = value.trim();
  const genericPrefixes = [label, defaultLabelForId(id), title, `${label} — ${title}`, `${label}: ${title}`]
    .map(v => String(v ?? '').trim())
    .filter(Boolean);

  for (const prefix of genericPrefixes) {
    const escaped = escapeRegExp(prefix);
    result = result.replace(new RegExp(`^${escaped}\s*(?:[—:-]\s*)*`, 'i'), '').trim();
  }

  result = result.replace(/^(Introducción|Texto Base|Contexto Histórico(?: y Bíblico)?|Punto(?:\s+\d+)?|Aplicación(?:\s+(?:del\s+)?Punto\s+\d+)?|Ilustración(?:\s+(?:del\s+)?Punto\s+\d+)?|Tu Historia(?:\s*[-—]\s*Punto\s+\d+)?|Conclusión|Llamado|Oración)\s*(?:[—:-]\s*)+/i, '').trim();
  return result;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeHtmlAttr(value: string): string {
  return escapeHtml(value);
}
