# Proxy seguro para Claude Sonnet (Anthropic)

Este directorio contiene **dos implementaciones equivalentes** del proxy que media entre la PWA `Sermon Maker Pro` y la API de Anthropic. Elige **una** según tu hosting preferido. La API key vive **solo en el servidor** — nunca en el frontend.

## Endpoint

`POST /api/ai/sermon`

### Request body

```json
{
  "prompt": "Prompt maestro renderizado con variables sustituidas",
  "tipoId": "expositivo",
  "numPuntos": 4,
  "incluirTuHistoria": true
}
```

### Response body

```json
{
  "titulo": "Sermón sobre la transformación",
  "contenidoHTML": "<div class=\"smart-block\">…</div>…"
}
```

Para conectarlo a la app, pon `VITE_AI_ENDPOINT=https://tu-dominio/api/ai/sermon` en `.env`.

## Variables de entorno requeridas (servidor)

- `ANTHROPIC_API_KEY` — clave secreta de Anthropic.
- `ANTHROPIC_MODEL` (opcional) — por defecto `claude-sonnet-4-20250514`. Ajusta al modelo Sonnet que tengas habilitado.

## Implementación 1 — Vercel / Next.js API route

Coloca [`vercel/sermon.ts`](./vercel/sermon.ts) en tu proyecto Vercel como `api/ai/sermon.ts`.

## Implementación 2 — Cloudflare Worker

Despliega [`cloudflare/worker.ts`](./cloudflare/worker.ts) como Worker. Añade `ANTHROPIC_API_KEY` como secreto: `wrangler secret put ANTHROPIC_API_KEY`.

## Seguridad

- **Nunca** expongas la clave en variables `VITE_*`.
- Restringe el CORS al dominio donde corre la PWA.
- Añade rate-limiting (Anthropic facturará por cada llamada).
- Considera firmar las requests con un token compartido entre tu PWA y el proxy si quieres una capa extra (la PWA puede pasar un secreto en el body que el proxy valide).
