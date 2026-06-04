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

const SYSTEM_PROMPT = `Eres un asistente experto en redactar sermones cristianos profundamente bíblicos, pastorales, emocionalmente poderosos y estructuralmente profesionales. SIEMPRE devuelves la respuesta en JSON estricto con la forma { "titulo": string, "contenidoHTML": string }, sin texto adicional ni cercas de código.

El campo contenidoHTML debe ser HTML válido que use bloques con la siguiente forma para cada sección estructural:

<div class="smart-block" data-label-id="<id>" data-label="<label>" data-color="<#hex>" data-titulo="<titulo opcional>" style="--label-color:<#hex>">
  <div class="smart-block-header" contenteditable="false"><etiqueta y título></div>
  <div class="smart-block-body"><p>contenido</p></div>
</div>

IDs y colores estándar:
- introduccion #6b8e6e
- texto-base #4a6fa5
- contexto-historico #65a30d
- punto #8a2f2a
- subpunto #b08a4a
- ilustracion #d97706
- cita-biblica #6d28d9
- aplicacion #2563eb
- llamado #be123c
- conclusion #475569
- oracion #7c3aed
- tu-historia #c2410c
- transicion #94a3b8
- testimonio #0891b2
- nota-pastoral #ea580c

Reglas:
- Si el usuario lo pide, incluye un bloque "Tu Historia" después de cada Punto, con sugerencia, categorías y un ejemplo IA.
- No uses markdown, solo HTML con los bloques.
- Genera el número de puntos solicitado (puede ser >4).
- Aumenta el material en todas las secciones: introducción, contexto histórico, puntos, aplicaciones, ilustraciones, conclusión y llamado.
- Incluye transiciones claras.
- No añadas bloques extra de cita-biblica, testimonio o nota-pastoral a menos que sean estrictamente necesarios.
- Cada bloque debe ser sustantivo y útil, pero claro y bien estructurado.
- Guía de longitud: introducción 2 párrafos, contexto histórico 2 párrafos, texto base 1 párrafo, cada punto 2 párrafos, cada aplicación 1 párrafo sólido, cada ilustración 1 párrafo sólido, cada bloque Tu Historia 1 párrafo sólido, conclusión 1 párrafo, llamado 1 párrafo, oración 1 párrafo.
- Usa exactamente una introducción, un contexto histórico, un texto base, __NUM_PUNTOS__ puntos, una aplicación por punto, una ilustración por punto, y solo un bloque Tu Historia por punto cuando se solicite.
- Mantén el sermón completo en un tamaño amplio pero razonable para responder rápido en una llamada síncrona.
- Sé pastoralmente cálido, bíblicamente sólido y emocionalmente poderoso.
- Prioriza profundidad y desarrollo real en cada sección.
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = process.env.ALLOWED_ORIGIN ?? '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada' }); return; }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {};
  const userPrompt: string = body.prompt ?? '';
  const numPuntos: number = Number(body.numPuntos) || 4;
  const incluirTuHistoria: boolean = !!body.incluirTuHistoria;
  if (!userPrompt) { res.status(400).json({ error: 'Falta prompt' }); return; }

  const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
  const maxTokens = Math.min(4200, 1800 + (numPuntos * 320) + (incluirTuHistoria ? 320 : 0));

  const systemPrompt = SYSTEM_PROMPT.replace('__NUM_PUNTOS__', String(numPuntos));

  const baseUserMessage = `${userPrompt}

INSTRUCCIONES TÉCNICAS:
- Número de puntos: ${numPuntos}
- Incluir bloque "Tu Historia" después de cada punto: ${incluirTuHistoria ? 'sí' : 'no'}
- Desarrolla ampliamente cada sección del sermón con material útil, sustantivo y bien estructurado.
- Mantén una extensión rica pero controlada para que la respuesta termine en una sola llamada sin excederse innecesariamente.
- Entrega el JSON completo y cerrado; no dejes bloques ni cadenas HTML incompletas.
- Responde SOLO con JSON: {"titulo": "...", "contenidoHTML": "..."} sin texto adicional.`;

  const attempts = [
    { maxTokens, userMessage: baseUserMessage },
    {
      maxTokens: Math.max(2400, Math.floor(maxTokens * 0.7)),
      userMessage: `${baseUserMessage}
- Si la respuesta se hace demasiado larga, conserva todas las secciones requeridas pero usa un solo párrafo por bloque y no añadas bloques opcionales.`
    }
  ];

  try {
    let lastText = '';

    for (const attempt of attempts) {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
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
        res.status(resp.status).json({ error: 'Anthropic API error', detail: text });
        return;
      }

      const data = await resp.json() as any;
      lastText = extractAnthropicText(data);
      const parsed = parseAnthropicJSON(lastText);
      if (parsed) {
        res.status(200).json({
          titulo: parsed.titulo ?? 'Sermón generado',
          contenidoHTML: parsed.contenidoHTML ?? parsed.html ?? ''
        });
        return;
      }
    }

    res.status(502).json({ error: 'Respuesta IA no contiene JSON', raw: lastText });
  } catch (e: any) {
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
