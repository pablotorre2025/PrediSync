/**
 * Cloudflare Worker — POST /api/ai/sermon
 *
 * Bindings/Secrets requeridos:
 *   ANTHROPIC_API_KEY  (wrangler secret put ANTHROPIC_API_KEY)
 *   ANTHROPIC_MODEL    (var opcional)
 *   ALLOWED_ORIGIN     (var opcional)
 */

interface Env {
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_MODEL?: string;
  ALLOWED_ORIGIN?: string;
}

const SYSTEM_PROMPT = `Eres un asistente experto en redactar sermones cristianos profundamente bíblicos, pastorales, emocionalmente poderosos y estructuralmente profesionales. SIEMPRE devuelves la respuesta en JSON estricto con la forma { "titulo": string, "contenidoHTML": string }, sin texto adicional ni cercas de código.

El contenidoHTML usa bloques <div class="smart-block" data-label-id="..." data-label="..." data-color="#hex" data-titulo="..." style="--label-color:#hex"><div class="smart-block-header" contenteditable="false">...</div><div class="smart-block-body"><p>...</p></div></div>.

IDs y colores estándar: introduccion #6b8e6e · texto-base #4a6fa5 · contexto-historico #65a30d · punto #8a2f2a · subpunto #b08a4a · ilustracion #d97706 · cita-biblica #6d28d9 · aplicacion #2563eb · llamado #be123c · conclusion #475569 · oracion #7c3aed · tu-historia #c2410c · transicion #94a3b8 · testimonio #0891b2 · nota-pastoral #ea580c.

Reglas: Si se pide, añade "Tu Historia" después de cada Punto, con sugerencia, categorías y ejemplo. Genera el número de puntos solicitado (puede ser >4). Aumenta el material en todas las secciones: introducción, contexto histórico, puntos, aplicaciones, ilustraciones, conclusión y llamado. Incluye transiciones claras. No añadas bloques extra de cita-biblica, testimonio o nota-pastoral a menos que sean estrictamente necesarios. Guía de longitud: introducción 2 párrafos, contexto histórico 2 párrafos, texto base 1 párrafo, cada punto 2 párrafos, cada aplicación 1 párrafo sólido, cada ilustración 1 párrafo sólido, cada bloque Tu Historia 1 párrafo sólido, conclusión 1 párrafo, llamado 1 párrafo, oración 1 párrafo. Usa exactamente una introducción, un contexto histórico, un texto base, __NUM_PUNTOS__ puntos, una aplicación por punto, una ilustración por punto, y solo un bloque Tu Historia por punto cuando se solicite. Mantén el sermón completo en un tamaño amplio pero razonable para responder rápido en una llamada síncrona. Sé pastoral, bíblico, emocionalmente impactante. No uses markdown.`;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? '*';
    const cors: Record<string, string> = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return jsonResp({ error: 'Method not allowed' }, 405, cors);
    if (!env.ANTHROPIC_API_KEY) return jsonResp({ error: 'ANTHROPIC_API_KEY no configurada' }, 500, cors);

    let body: any;
    try { body = await req.json(); } catch { return jsonResp({ error: 'JSON inválido' }, 400, cors); }

    const userPrompt: string = body.prompt ?? '';
    const numPuntos: number = Number(body.numPuntos) || 4;
    const incluirTuHistoria: boolean = !!body.incluirTuHistoria;
    if (!userPrompt) return jsonResp({ error: 'Falta prompt' }, 400, cors);

    const model = env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
    const maxTokens = Math.min(4200, 1800 + (numPuntos * 320) + (incluirTuHistoria ? 320 : 0));
    const systemPrompt = SYSTEM_PROMPT.replace('__NUM_PUNTOS__', String(numPuntos));
    const baseUserMessage = `${userPrompt}\n\nINSTRUCCIONES TÉCNICAS:\n- Puntos: ${numPuntos}\n- Tu Historia tras cada punto: ${incluirTuHistoria ? 'sí' : 'no'}\n- Desarrolla ampliamente cada sección del sermón con material útil, sustantivo y bien estructurado.\n- Mantén una extensión rica pero controlada para que la respuesta termine en una sola llamada sin excederse innecesariamente.\n- Entrega el JSON completo y cerrado; no dejes bloques ni cadenas HTML incompletas.\n- Responde SOLO JSON {"titulo":"...","contenidoHTML":"..."}.`;
    const attempts = [
      { maxTokens, userMessage: baseUserMessage },
      {
        maxTokens: Math.max(2400, Math.floor(maxTokens * 0.7)),
        userMessage: `${baseUserMessage}\n- Si la respuesta se hace demasiado larga, conserva todas las secciones requeridas pero usa un solo párrafo por bloque y no añadas bloques opcionales.`
      }
    ];

    let lastText = '';

    for (const attempt of attempts) {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: attempt.maxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: attempt.userMessage }]
        })
      });

      if (!resp.ok) {
        const text = await resp.text();
        return jsonResp({ error: 'Anthropic API error', detail: text }, resp.status, cors);
      }
      const data = await resp.json() as any;
      lastText = extractAnthropicText(data);
      const parsed = parseAnthropicJSON(lastText);
      if (parsed) {
        return jsonResp({
          titulo: parsed.titulo ?? 'Sermón generado',
          contenidoHTML: parsed.contenidoHTML ?? parsed.html ?? ''
        }, 200, cors);
      }
    }

    return jsonResp({ error: 'Respuesta no JSON', raw: lastText }, 502, cors);
  }
};

function extractAnthropicText(data: any): string {
  if (!data) return '';
  if (typeof data === 'string') return data.trim();
  if (typeof data.completion === 'string') return data.completion.trim();
  if (typeof data.output === 'string') return data.output.trim();
  if (Array.isArray(data.content) && typeof data.content[0]?.text === 'string') return data.content[0].text.trim();
  if (Array.isArray(data?.output?.[0]?.content) && typeof data.output[0].content[0]?.text === 'string') return data.output[0].content[0].text.trim();
  return '';
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

function jsonResp(obj: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}
