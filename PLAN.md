# PrediSync — Plan de Implementación

App web estática con páginas separadas para el predicador (`predisync-host.html`) y el traductor (`predisync-guest.html`), más un selector inicial (`index.html`). La comunicación se realiza por WebRTC peer-to-peer sobre Wi-Fi local. Sin servidor, sin cuentas, offline. Stack: HTML5 + CSS vanilla + JS vanilla + IndexedDB.

> **Dispositivo objetivo principal: Safari en iPad.** El uso en MacBook es excepcional. El diseño
> es mobile-first (táctil, 44×44px, long-press en vez de clic derecho). No requiere cambios de código,
> pero hay que tener en cuenta lo siguiente en iPad:
>
> 1. **Permiso de "Red local":** iPadOS pide permiso la primera vez que se usa WebRTC en la red local.
>    Hay que aceptarlo o los dispositivos no se conectan. (Aviso del sistema, no controlable por código.)
> 2. **Portapapeles:** En Safari iOS copiar solo funciona dentro de un toque del usuario (ya implementado)
>    y puede fallar abriendo el archivo como `file://`. Recomendado: agregar a pantalla de inicio (PWA).
>    Existe *fallback* con `execCommand('copy')`.
> 3. **Atajos de teclado (F9):** Solo aplican con teclado externo Bluetooth; irrelevantes en iPad sin
>    teclado, pero se conservan sin estorbar.
> 4. **Fallback de red:** Si la Wi-Fi de la iglesia tiene "AP Isolation", usar hotspot del iPhone.

---

## ⭐ REGLA GLOBAL DE VERSIONADO (anti-caché)

> Esta regla es obligatoria en cada cambio del proyecto.

- Constante `APP_VERSION` en la parte superior del JS, formato `1.XXX` (arranca en `1.001`).
- Un **badge siempre visible** en pantalla muestra la versión, ej. `v1.001`.
- **Cada vez que se edita el archivo, se incrementa +1 el último número:** `1.001 → 1.002 → 1.003…`
- Propósito: confirmar de un vistazo que el navegador **no** está sirviendo una versión vieja del caché.
- Refuerzo: `<meta http-equiv="Cache-Control" content="no-cache">`.
- El versionado es **manual** (no hay build automático). Cada edición = subir la versión.

### Bitácora de versiones

| Versión | Cambio |
|---|---|
| 1.001 | Primera entrega completa: `predisync.html` con Fases 0–9 (F1–F14) implementadas |

---

## Fases de implementación

- [x] **Fase 0 — Andamiaje base.** Estructura HTML, `<meta viewport>`, manifest/apple-touch,
      CSS con variables + `clamp()` + Grid, modo claro/oscuro, `APP_VERSION` + badge, router de pantallas.
- [x] **Fase 1 — Rol + Señalización WebRTC.** Elegir Predicador/Intérprete; intercambio manual
      SDP+ICE en Base64; `RTCPeerConnection` + `RTCDataChannel`; indicador de conexión (verde/naranja/rojo).
- [x] **Fase 2 — Protocolo de mensajes.** Envío/recepción JSON (`scroll`, `offscript`, `sermon`,
      `annotation`, `annotation_remove`) + sanitización HTML (whitelist).
- [x] **Fase 3 — Carga de texto + Editor (F4, F11, F14).** Parseo por párrafos; bilingüe ES/EN;
      editor `contenteditable` (10 fuentes, 22 tamaños, B/I/U, alineación, listas, color texto,
      resaltado 2×5 personalizable, cita, separador, título).
- [x] **Fase 4 — Vista Predicador (F1,F2,F3,F5,F6,F7,F8,F9).** Tocar párrafo, botón "Fuera del
      Guion", barra de progreso, edición en vivo, navegación numérica, tamaño de letra, tema, atajos.
- [x] **Fase 5 — Vista Intérprete (F1,F2,F3,F7,F8).** Scroll sincronizado + superposición roja.
- [x] **Fase 6 — Anotaciones de palabras clave (F10).** Long-press → marcar/desmarcar; resaltado en ambos.
- [x] **Fase 7 — Reconexión automática (F12).** Detectar caída, banner "Reconectando…", ICE restart, fallback 30s.
- [x] **Fase 8 — Historial / IndexedDB (F13).** Guardar predicaciones, recientes, swipe-to-delete, paleta personalizada.
- [x] **Fase 9 — Pulido.** Accesibilidad WCAG AA, táctil 44×44, fallback AP-Isolation (hotspot), PWA.

**MVP usable** = Fases 0→2 + F1/F2/F3/F4.

---

## Funcionalidades (referencia rápida)

| # | Funcionalidad | Fase |
|---|---|---|
| F1 | Sincronización de scroll | 4 / 5 |
| F2 | Botón "Fuera del Guion" | 4 / 5 |
| F3 | Barra de progreso | 4 / 5 |
| F4 | Carga de texto por párrafos | 3 |
| F5 | Modo edición en tiempo real | 4 |
| F6 | Navegación rápida por párrafos | 4 |
| F7 | Control de tamaño de letra | 4 / 5 |
| F8 | Modo oscuro / claro | 4 / 5 |
| F9 | Atajos de teclado | 4 |
| F10 | Anotaciones y palabras clave | 6 |
| F11 | Texto bilingüe ES/EN | 3 |
| F12 | Reconexión automática | 7 |
| F13 | Historial (IndexedDB) | 8 |
| F14 | Editor de texto enriquecido | 3 |

---

## Protocolo de mensajes (RTCDataChannel)

```json
{ "type": "scroll", "index": 4 }
{ "type": "offscript", "value": true }
{ "type": "sermon", "format": "html", "paragraphs_es": ["..."], "paragraphs_en": ["..."] }
{ "type": "annotation", "paraIndex": 3, "start": 12, "end": 28, "label": "keyword" }
{ "type": "annotation_remove", "paraIndex": 3, "start": 12, "end": 28 }
```

---

## Pantallas

1. Selección de rol
2. Conexión (señalización SDP+ICE)
3. Carga de texto (solo predicador)
4. Vista principal — Predicador
5. Vista principal — Intérprete

---

## Verificación

1. Abrir `predisync.html` en dos dispositivos → señalización → "Conectado".
2. Cargar sermón bilingüe → verificar parseo y formato.
3. Tocar párrafo en predicador → intérprete hace scroll < 100 ms.
4. Activar "Fuera del Guion" → superposición roja aparece/desaparece.
5. Probar atajos, tamaño de letra, modo oscuro.
6. Marcar palabra clave → resaltada en ambos.
7. Cortar Wi-Fi → banner reconexión; restaurar → continúa.
8. Recargar predicador → historial muestra la sesión.
9. **Confirmar que el badge `v1.XXX` sube en cada edición del archivo.**

---

## Decisiones

- Archivo **único** `predisync.html` (todo inline). Sin frameworks, sin build, sin npm.
- Sin STUN/TURN: solo red local. Hotspot del iPhone como fallback ante AP Isolation.
- Versionado **manual** de `APP_VERSION` en cada edición.

## Roadmap futuro (fuera de v1.0)

- v2.0 multi-intérprete · v2.1 exportar PDF/TXT · v2.2 temporizador.
