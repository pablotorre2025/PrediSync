# Sermon Maker Pro

PWA premium privada para Pablo y Saida — diseñada para redactar, estructurar, guardar y predicar sermones de manera profesional desde iPad/iPhone (y escritorio).

## Características principales

- **PWA instalable**, offline-first (IndexedDB vía Dexie + caché Firestore + service worker).
- **Editor avanzado** estilo Google Docs basado en TipTap: B/I/U/S, alineaciones, listas (incluyendo checklists), tablas, imágenes, hipervínculos, colores, resaltados, +15 tipografías y **tamaño en px libre**.
- **Smart Labels** (Introducción, Punto, Subpunto, Ilustración, Cita bíblica, Aplicación, Llamado, Conclusión, Oración, Transición, Testimonio, Contexto histórico, Nota pastoral, Tu Historia, Personalizado…) con color distintivo que persiste en modo predicación.
- **Bloque "Tu Historia"** en cada punto: ejemplo IA + sugerencia + categorías + campo editable + opción privada.
- **Modo predicación** a pantalla completa, navegación por paneles con botones grandes **A+ / A−** (sin slider), wake-lock, oculta notas privadas, mantiene colores.
- **IA Claude Sonnet** para generar sermones completos por tipo (Expositivo, Temático, Doctrinal, Deductivo, Inductivo, Narrativo, Evangelístico, Devocional, Apologético, Profético, Didáctico, Litúrgico, Misiológico) — prompts editables, clonables, restaurables.
- **Biblias JSON** importables, consulta por referencia o por texto, inserción con formato.
- **Estimación de duración** automática en tiempo real (ppm configurable por usuario).
- **Dashboard** con búsqueda, etiquetas, series, estados (borrador/listo/predicado/archivado), favoritos, duplicar, eliminar.
- **Login simple**: dos botones (Pablo / Saida) + PIN. Internamente se mapea a Firebase Auth (email derivado).
- **Sincronización Firestore** con indicador (local · sin internet · sincronizando · sincronizado).

## Cómo correr

```bash
npm install
npm run dev
```

Para producción:

```bash
npm run build
npm run preview
```

## Configuración

Copia `.env.example` a `.env` y configura el endpoint de IA si deseas usar Claude Sonnet real (de lo contrario funciona en modo demo).

```bash
cp .env.example .env
```

### Proxy IA seguro (recomendado)

La API key de Anthropic **nunca** debe vivir en el frontend. Despliega un endpoint (Cloud Function / Vercel Function / Cloudflare Worker) que reciba `{ prompt, tipoId, numPuntos, incluirTuHistoria }` y devuelva `{ titulo, contenidoHTML }`, manteniendo la API key en variables de entorno del servidor. Apunta `VITE_AI_ENDPOINT` a esa URL.

## Reglas de Firestore

Ver [firestore.rules](./firestore.rules). Cada usuario solo puede leer y escribir sus propios sermones (segregación por `userId`).

## Backups

- Exporta cualquier sermón como JSON desde el editor.
- "Imprimir / PDF" desde el editor genera un PDF imprimible.

## Privacidad

App diseñada solo para Pablo y Saida. No hay registro público, no hay distribución masiva. Se recomienda usar PINs distintos y robustos por usuario.
