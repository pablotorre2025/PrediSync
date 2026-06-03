# PrediSync — Especificación de Producto

**Documento de Requisitos y Descripción Funcional**
*Versión 1.3 — Junio 2026*

---

## Resumen Ejecutivo

PrediSync es una aplicación web progresiva (PWA) diseñada para sincronizar en tiempo real la lectura de una predicación entre dos dispositivos móviles — el del predicador y el del intérprete — usando únicamente la red Wi-Fi local del lugar donde se realiza el servicio religioso, sin depender de un servidor externo, sin suscripciones y sin cuentas de desarrollador de Apple.

El problema que resuelve es concreto: cuando un predicador hispanohablante predica en un entorno angloparlante con apoyo de un intérprete, ambos comparten el mismo texto impreso o digital. El predicador lee de su guion, pero en cualquier momento puede salirse de él para hablar de forma espontánea (inspirado por el momento). El intérprete, que mira su propia pantalla, no tiene manera de saber si el predicador está leyendo el texto o improvisando, lo que rompe el flujo y la naturalidad de la predicación. PrediSync elimina este problema.

---

## Problema Central

### Escenario de uso

Un predicador hispanohablante es invitado a predicar en un contexto donde la audiencia habla inglés. Para superar la barrera del idioma, trabaja con un intérprete simultáneo que traduce en tiempo real. Ambos tienen el mismo texto de la predicación en sus dispositivos.

### Puntos de fricción actuales

1. **Pérdida de sincronía en el scroll:** Cuando el predicador avanza en el texto, el intérprete no se entera automáticamente. Cada uno mueve su pantalla de forma independiente.
2. **Improvisación sin señal:** El predicador puede apartarse del guion para hablar algo inspirado en el momento. El intérprete sigue mirando el texto sin saber que el predicador ya no lo está leyendo.
3. **Regreso al guion sin señal:** Al retomar el texto, el predicador tiene que interrumpir la predicación para indicarle verbalmente al intérprete por el micrófono que volvió al guion, lo cual resulta torpe y poco profesional.
4. **Dependencia de herramientas inadecuadas:** Las soluciones existentes (prompters de video, aplicaciones de teleprompter) no están diseñadas para trabajo colaborativo en tiempo real entre dos dispositivos.

---

## Solución Propuesta

Una PWA de archivo único (`predisync.html`) que:

- Funciona en Safari de iPad y en cualquier navegador moderno sin instalación.
- Se agrega al inicio del iPad como ícono de aplicación nativa (sin App Store).
- Establece una conexión directa entre dos dispositivos usando **WebRTC (RTCDataChannel)** sobre la red Wi-Fi local del lugar.
- No requiere internet, servidores externos, ni cuentas de ningún tipo.
- El archivo se comparte entre ambos dispositivos una sola vez por AirDrop, WhatsApp o cualquier medio.

---

## Roles de Usuario

### Predicador (Host / Offerer)
El predicador controla la sesión. Es quien carga el texto de la predicación, controla el scroll y activa la señal visual de "fuera del guion".

### Intérprete / Traductor (Guest / Answerer)
El intérprete recibe todos los eventos del predicador de forma pasiva. Su pantalla se sincroniza con la del predicador. Recibe la alerta visual cuando el predicador se aparta del texto.

---

## Flujo de Conexión

La conexión entre los dos iPads se realiza mediante el protocolo **WebRTC peer-to-peer**, lo que significa que los datos viajan directamente de un dispositivo al otro sin pasar por ningún servidor.

Dado que WebRTC requiere un intercambio inicial de metadatos de negociación (denominado "señalización" o *signaling*), y que no existe un servidor que facilite este intercambio, PrediSync usa el siguiente método manual:

1. El predicador genera un **código de oferta** (un bloque de texto en Base64 que contiene la descripción SDP y los candidatos ICE).
2. Copia ese código y lo envía al intérprete por cualquier medio (WhatsApp, mensaje de texto, etc.).
3. El intérprete pega ese código en su app, genera un **código de respuesta** y se lo envía de vuelta al predicador.
4. El predicador pega el código de respuesta y presiona "Conectar".
5. La conexión se establece automáticamente sobre la red Wi-Fi local.

Este proceso de intercambio se realiza **una sola vez**. En uso normal dentro de la misma red, la conexión puede restablecerse rápidamente.

---

## Funcionalidades Requeridas

### F1 — Sincronización de texto (scroll)

| Atributo | Detalle |
|---|---|
| **Método** | El predicador toca un párrafo específico en su pantalla |
| **Efecto en intérprete** | Su pantalla hace scroll automático hasta el mismo párrafo |
| **Alternativa táctil** | Deslizar la pantalla del predicador hacia arriba/abajo avanza o retrocede entre párrafos |
| **Indicador visual** | El párrafo activo se resalta con un color de acento (borde izquierdo + fondo diferenciado) |
| **Latencia esperada** | Menor a 100ms en red Wi-Fi local |

El texto se divide en bloques de párrafo numerados. Cada bloque tiene un identificador único. Cuando el predicador selecciona un bloque, su ID se transmite al intérprete vía RTCDataChannel. El intérprete hace scroll programático hasta ese bloque.

---

### F2 — Botón "Fuera del Guion" (Off Script)

Este es el diferenciador central del producto.

| Estado | Pantalla del Predicador | Pantalla del Intérprete |
|---|---|---|
| **En guion (normal)** | Botón con etiqueta "EN GUION", color neutral | Vista normal del texto sincronizado |
| **Fuera del guion** | Botón activo con color rojo pulsante, etiqueta "🔴 FUERA DEL GUION" | Superposición de pantalla completa en rojo con texto gigante "Fuera del Guion" y animación |

**Comportamiento:**
- El predicador presiona el botón una vez → activa el estado "fuera del guion".
- El intérprete recibe el mensaje de forma instantánea y la superposición cubre toda su pantalla.
- El predicador presiona el botón nuevamente → desactiva el estado.
- La superposición del intérprete desaparece y puede volver a leer el texto sincronizado.

**Diseño de la superposición del intérprete:**
- Fondo de color rojo intenso (modo oscuro) o rojo claro (modo claro).
- Ícono grande animado (por ejemplo, una mano en señal de pausa).
- Texto en tipografía serif grande en cursiva: *"Fuera del Guion"*.
- Subtexto explicativo: "El predicador está hablando fuera del texto. Espera su señal."

---

### F3 — Barra de progreso de lectura

Una barra horizontal delgada en la parte superior de la pantalla muestra el avance en la predicación, basado en el párrafo activo en relación con el total. Se actualiza en ambas pantallas simultáneamente.

---

### F4 — Carga del texto de la predicación

El predicador pega el texto de su predicación completa en un área de texto después de establecer la conexión. La aplicación divide automáticamente el texto en párrafos usando líneas en blanco como separadores. El texto parseado se transmite al intérprete a través del canal de datos establecido.

---

### F5 — Modo edición en tiempo real (Predicador)

El predicador puede activar un modo de edición que convierte cada bloque de párrafo en un campo de texto editable. Esto permite corregir errores tipográficos o añadir notas sobre la marcha sin salir de la aplicación.

---

### F6 — Barra de navegación rápida

Una barra horizontal de botones numerados (uno por párrafo) permite al predicador saltar directamente a cualquier sección de la predicación con un solo toque. Útil para retomar el hilo después de una improvisación larga.

---

### F7 — Control de tamaño de letra

Un control accesible desde el encabezado permite ajustar el tamaño de la tipografía en cuatro niveles (Pequeña, Normal, Grande, Muy grande). El ajuste es local para cada dispositivo; el predicador y el intérprete pueden tener tamaños distintos según sus necesidades visuales.

---

### F8 — Modo oscuro / modo claro

La aplicación respeta la preferencia del sistema operativo del dispositivo y permite cambiarla manualmente desde el encabezado. El modo oscuro es el predeterminado para predicaciones en ambientes con poca luz (cultos nocturnos, santuarios oscuros). Ambos dispositivos son independientes en esta preferencia.

---

### F9 — Atajos de teclado (para uso con teclado externo en Mac o iPad)

| Tecla | Acción |
|---|---|
| `Espacio` / `→` / `↓` | Avanzar al siguiente párrafo |
| `←` / `↑` | Retroceder al párrafo anterior |
| `O` | Activar / desactivar el estado "fuera del guion" |

---

### F10 — Anotaciones y palabras clave resaltadas

El predicador puede seleccionar palabras o frases específicas dentro de cualquier párrafo y marcarlas como palabras clave. Estas anotaciones se transmiten al intérprete y aparecen visualmente resaltadas en su pantalla (por ejemplo, con un subrayado o fondo de color de acento). Esto permite al intérprete anticipar términos importantes, nombres propios o conceptos teológicos que requieren atención especial durante la traducción.

**Comportamiento:**
- El predicador mantiene presionado (long press) sobre una palabra o selecciona un fragmento de texto para abrir un menú contextual con la opción "Marcar como clave".
- Las palabras marcadas se muestran con un fondo de color en ambas pantallas simultáneamente.
- El predicador puede desmarcar cualquier anotación con un toque adicional.
- Las anotaciones se incluyen en la transmisión inicial del texto cuando se carga la predicación.

**Mensaje de protocolo:**
```json
{ "type": "annotation", "paraIndex": 3, "start": 12, "end": 28, "label": "keyword" }
```

---

### F11 — Texto bilingüe (español / inglés)

El predicador puede cargar dos versiones del mismo texto: una en español (para su propia lectura) y una en inglés (para que el intérprete la vea como referencia de la traducción esperada). La aplicación asigna automáticamente la versión en español al dispositivo del predicador y la versión en inglés al dispositivo del intérprete.

**Comportamiento:**
- En la pantalla de carga del texto, el predicador ve dos áreas de texto claramente etiquetadas: "Texto en Español (tu versión)" y "Texto en Inglés (versión del intérprete)".
- El campo de inglés es opcional. Si se deja vacío, ambos dispositivos muestran la versión en español.
- La sincronización de párrafos sigue siendo por índice numérico, por lo que los textos deben tener el mismo número de párrafos para que la sincronización sea precisa.
- El predicador puede alternar en su propia vista entre ambas versiones con un botón de cambio de idioma en la barra de herramientas.

**Mensaje de protocolo:**
```json
{ "type": "sermon", "paragraphs_es": ["Párrafo 1 ES..."], "paragraphs_en": ["Paragraph 1 EN..."] }
```

---

### F12 — Reconexión automática

Cuando la conexión WebRTC se interrumpe (por pérdida momentánea de Wi-Fi, bloqueo de pantalla, cambio de red, etc.), la aplicación detecta la desconexión y muestra un indicador visual claro. En lugar de requerir que el usuario repita el proceso completo de señalización, la app intenta restablecer la conexión automáticamente usando las credenciales SDP almacenadas en memoria durante la sesión activa.

**Comportamiento:**
- Al detectar `oniceconnectionstatechange === 'disconnected'` o `'failed'`, se activa el modo de reconexión.
- Un banner no intrusivo aparece en ambas pantallas indicando "Reconectando…" con un indicador de actividad.
- Si la reconexión tiene éxito, el banner desaparece y la sesión continúa desde el último párrafo activo.
- Si la reconexión falla después de 30 segundos, se muestra la opción de iniciar una nueva sesión manualmente.
- Durante el período de reconexión, la pantalla del intérprete mantiene el último párrafo visible para no perder el contexto de lectura.

**Indicadores de estado de conexión:**

| Estado | Indicador visual | Color |
|---|---|---|
| Conectado | Punto sólido + "Conectado" | Verde |
| Reconectando | Punto pulsante + "Reconectando…" | Naranja |
| Desconectado | Punto sólido + "Sin conexión" | Rojo |

---

### F13 — Historial de predicaciones (sesiones guardadas)

La aplicación guarda localmente en el dispositivo del predicador un historial de las predicaciones utilizadas, usando la API de almacenamiento del navegador (IndexedDB). Esto permite cargar una predicación previa con un solo toque, sin necesidad de volver a pegar el texto.

**Comportamiento:**
- Al presionar "Cargar y comenzar", la predicación se guarda automáticamente en el historial con la fecha y el primer párrafo como título de vista previa.
- Antes del área de texto de carga, se muestra una sección "Predicaciones recientes" con las últimas 10 sesiones guardadas.
- Cada entrada del historial muestra: fecha, hora, número de párrafos y los primeros 80 caracteres del texto como vista previa.
- El predicador puede tocar cualquier entrada para cargarla directamente, o eliminarla deslizando a la izquierda (swipe to delete).
- El historial es local al dispositivo y nunca se sincroniza ni se transmite al intérprete.
- Capacidad máxima sugerida: 20 predicaciones guardadas. Al superar este límite, se elimina automáticamente la más antigua.

**Estructura de datos en IndexedDB:**
```json
{
  "id": "uuid",
  "date": "2026-06-01T10:30:00",
  "title": "Primeros 80 caracteres del primer párrafo…",
  "paragraphs_es": ["..."],
  "paragraphs_en": ["..."],
  "annotations": []
}
```

---

## Arquitectura Técnica

### Stack tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| **Interfaz** | HTML5 + CSS (variables, clamp, Grid) + JavaScript vanilla | Sin dependencias externas, funciona offline |
| **Comunicación en tiempo real** | WebRTC `RTCDataChannel` | Peer-to-peer directo, sin servidor |
| **Señalización inicial** | Intercambio manual de SDP+ICE en Base64 | Elimina la necesidad de un servidor de señalización |
| **Reconexión automática** | Reutilización de SDP en memoria + ICE restart | Sin nueva señalización manual |
| **Almacenamiento local** | IndexedDB (historial de predicaciones) | Persistente, funciona offline, sin servidor |
| **Distribución** | Archivo `.html` único | Portable, compartible por cualquier medio |
| **Instalación en iPad** | Safari → Agregar a inicio (PWA) | Experiencia de app nativa sin App Store |

### Protocolo de mensajes completo (RTCDataChannel)

Todos los mensajes se transmiten como JSON serializado:

```json
// Sincronización de párrafo
{ "type": "scroll", "index": 4 }

// Estado off-script
{ "type": "offscript", "value": true }

// Transmisión del texto (bilingüe)
{ "type": "sermon", "paragraphs_es": ["Párr. 1..."], "paragraphs_en": ["Par. 1..."] }

// Anotación de palabra clave
{ "type": "annotation", "paraIndex": 3, "start": 12, "end": 28, "label": "keyword" }

// Eliminar anotación
{ "type": "annotation_remove", "paraIndex": 3, "start": 12, "end": 28 }
```

### Consideraciones de red

- **Sin internet requerido:** WebRTC en modo peer-to-peer local (sin servidores STUN/TURN) funciona en redes Wi-Fi cerradas como las de una iglesia.
- **Sin router con restricciones:** Si la red de la iglesia bloquea el tráfico peer-to-peer entre dispositivos (política de cliente aislado / "AP Isolation"), la alternativa es crear un hotspot desde el iPhone del predicador y conectar ambos iPads a él.
- **Compatibilidad:** WebRTC está soportado en Safari 11+ (iOS 11+), Chrome 23+, Firefox 22+ y Edge 79+.

---

## Requisitos No Funcionales

| Requisito | Descripción |
|---|---|
| **Costo** | Cero. Sin suscripciones, sin APIs de pago, sin cuenta de desarrollador Apple ($99/año) |
| **Privacidad** | El texto de la predicación nunca sale de la red local. No se envía a ningún servidor |
| **Portabilidad** | Un único archivo `.html` de menos de 150KB. No requiere instalación ni dependencias |
| **Compatibilidad** | iPad (Safari), iPhone (Safari), MacBook (cualquier navegador moderno) |
| **Accesibilidad** | Tipografía mínima de 12px, contraste WCAG AA, botones con área táctil mínima de 44x44px |
| **Resiliencia** | Reconexión automática ante pérdidas de conexión. El intérprete mantiene el último estado visible |
| **Persistencia** | Historial de predicaciones guardado localmente via IndexedDB, sin límite de tiempo |

---

## Pantallas Principales

### 1. Pantalla de selección de rol
El usuario elige entre "Soy el Predicador" o "Soy el Intérprete". Esta elección determina el modo de operación de la aplicación.

### 2. Pantalla de conexión
Guía paso a paso para el intercambio del código de señalización. Diferente flujo para predicador (genera la oferta primero) y para el intérprete (genera la respuesta). Indicador de estado de conexión en tiempo real.

### 3. Pantalla de carga del texto (solo predicador)
Sección de predicaciones recientes con acceso rápido al historial guardado. Dos áreas de texto para cargar la versión en español y, opcionalmente, la versión en inglés. Botón para procesar y comenzar.

### 4. Vista principal — Predicador
- Encabezado con botón "Fuera del Guion", controles de tema, tipografía y botón de edición
- Barra de navegación numérica por párrafos
- Área de scroll con bloques de párrafo tocables, resaltado del párrafo activo y palabras clave marcadas
- Barra de progreso en la parte superior
- Banner de estado de conexión (visible al reconectar)

### 5. Vista principal — Intérprete
- Encabezado con indicador de conexión y controles de tema/tipografía
- Área de scroll con párrafos sincronizados automáticamente y palabras clave resaltadas
- Superposición de pantalla completa "Fuera del Guion" (se activa remotamente)
- Banner de reconexión cuando la sesión se interrumpe

---

## Casos Extremos y Manejo de Errores

| Situación | Comportamiento esperado |
|---|---|
| La red Wi-Fi se cae durante la predicación | Reconexión automática. El intérprete mantiene el último párrafo visible |
| La reconexión automática falla tras 30 segundos | Se muestra opción para iniciar nueva sesión manualmente |
| El predicador cambia de párrafo sin conexión | Al reconectar, el predicador toca el párrafo actual para re-sincronizar |
| El código de señalización se pega incorrectamente | Mensaje de error claro con opción de reintentar sin reiniciar |
| El texto tiene diferente número de párrafos en ES e EN | La app advierte al predicador antes de transmitir. La sincronización puede quedar desfasada |
| IndexedDB no está disponible (modo privado de Safari) | La app funciona normalmente sin el historial. Se muestra aviso informativo |
| El texto contiene párrafos muy largos | Área de texto con scroll interno. Tipografía ajustable |
| La red tiene "AP Isolation" activa | Solución alternativa documentada: usar hotspot del iPhone del predicador |

---

## Resumen de Funcionalidades por Prioridad

| # | Funcionalidad | Prioridad |
|---|---|---|
| F1 | Sincronización de scroll entre dispositivos | 🔴 Alta |
| F2 | Botón "Fuera del Guion" con alerta visual | 🔴 Alta |
| F3 | Barra de progreso de lectura | 🔴 Alta |
| F4 | Carga de texto por párrafos | 🔴 Alta |
| F5 | Modo edición en tiempo real | 🔴 Alta |
| F6 | Barra de navegación rápida por párrafos | 🔴 Alta |
| F7 | Control de tamaño de letra | 🔴 Alta |
| F8 | Modo oscuro / modo claro | 🔴 Alta |
| F9 | Atajos de teclado | 🔴 Alta |
| F10 | Anotaciones y palabras clave resaltadas | 🔴 Alta |
| F11 | Texto bilingüe (español / inglés) | 🔴 Alta |
| F12 | Reconexión automática | 🔴 Alta |
| F13 | Historial de predicaciones (IndexedDB) | 🔴 Alta |
| F14 | Editor de texto enriquecido (Rich Text Editor) | 🔴 Alta |

---

## Roadmap Futuro (Post v1.0)

- **v2.0 — Multi-intérprete:** Soporte para más de dos dispositivos, permitiendo intérpretes para múltiples idiomas simultáneamente en el mismo servicio.
- **v2.1 — Exportar sesión:** Posibilidad de exportar una predicación del historial como archivo `.txt` o `.pdf` para archivo o impresión.
- **v2.2 — Temporizador de predicación:** Cronómetro visible solo para el predicador que muestra el tiempo transcurrido desde el inicio de la sesión.

---

*Documento preparado para comunicar los requisitos del producto a un desarrollador o para uso como brief de desarrollo propio.*
*Versión 1.3 — F14 ampliado: 10 familias tipográficas, 22 tamaños (11–52px), paleta de resaltado de 10 colores personalizables en 2 filas.*

---

### F14 — Editor de texto enriquecido (Rich Text Editor)

La pantalla de carga de la predicación incluye un editor de texto completo que permite al predicador dar formato visual a su contenido antes de comenzar la sesión. El formato aplicado se preserva y se muestra en ambas pantallas durante la predicación.

#### Herramientas de formato disponibles

**Tipografía:**

| Control | Opciones |
|---|---|
| **Familia tipográfica** | Serif (Georgia), Sans-serif (Inter), Monoespaciada (Courier New), Formal (Garamond), Humanista (Verdana), Moderna (Trebuchet MS), Clásica (Times New Roman), Elegante (Palatino), Técnica (Arial), Manuscrita (Comic Sans MS) |
| **Tamaño de letra** | Escala completa de 22 tamaños: 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 40, 44, 48, 50, 52 px — seleccionable por texto seleccionado o por bloque completo |
| **Peso** | Normal, **Negrita** |
| **Estilo** | *Cursiva* |
| **Decoración** | Subrayado |
| **Color de texto** | Paleta de 10 colores predefinidos organizados en 2 filas de 5 + selector de color libre (color picker nativo del navegador) |
| **Color de resaltado** | 10 colores de resaltado organizados en 2 filas de 5, totalmente personalizables por el usuario (ver detalle abajo) |

**Estructura y alineamiento:**

| Control | Comportamiento |
|---|---|
| **Alineación izquierda** | Predeterminado para lectura fluida |
| **Alineación centrada** | Para versículos bíblicos, citas o títulos de sección |
| **Alineación derecha** | Uso ocasional para elementos visuales |
| **Justificado** | Para bloques de texto densos |

**Listas:**

| Tipo | Ejemplo |
|---|---|
| **Bullets (viñetas)** | • Punto uno / • Punto dos |
| **Lista numerada** | 1. Primer punto / 2. Segundo punto |
| **Sangría** | Aumentar / reducir nivel de indentación |

**Paleta de colores de resaltado — 10 colores en 2 filas:**

La paleta de resaltado se presenta como una cuadrícula de 2 filas × 5 columnas. Cada celda de color es editable: al mantener presionado (long press en iPad) o hacer clic derecho (Mac), se abre el selector de color nativo del sistema para reemplazarlo con cualquier color deseado. Los colores personalizados se guardan localmente (IndexedDB) y se mantienen entre sesiones.

**Colores predeterminados de fábrica:**

| Fila | Color 1 | Color 2 | Color 3 | Color 4 | Color 5 |
|---|---|---|---|---|---|
| **Fila 1** | Amarillo `#FFFF00` | Naranja `#FFB347` | Rosa `#FFB6C1` | Verde lima `#ADFF2F` | Celeste `#87CEEB` |
| **Fila 2** | Verde menta `#98FF98` | Lavanda `#E6E6FA` | Durazno `#FFDAB9` | Turquesa `#AFEEEE` | Coral `#F08080` |

**Comportamiento de personalización:**
- Cada uno de los 10 slots es reemplazable individualmente.
- Al modificar un color, la app muestra una vista previa del color nuevo sobre texto de muestra antes de confirmar.
- Un botón "Restaurar predeterminados" devuelve la paleta a los 10 colores de fábrica.
- Los colores personalizados se sincronizan al historial de la sesión (F13) para que la misma predicación siempre abra con la misma paleta usada originalmente.

**Bloques especiales:**
- **Cita / Blockquote:** Bloque visualmente diferenciado con borde izquierdo de acento, para versículos bíblicos o citas de autoridad.
- **Separador horizontal:** Línea divisoria entre secciones de la predicación.
- **Título de sección:** Texto en negrita, tamaño grande, usado para marcar partes (Introducción, Punto 1, Conclusión, etc.).

#### Barra de herramientas del editor

La barra de herramientas del editor es fija en la parte superior del área de edición, agrupada por categoría:

```
[ Tipo de letra ▾ ] [ Tamaño ▾ ] | [ B ] [ I ] [ U ] | [ ≡ ] [ ≡ ] [ ≡ ] [ ≡ ] | [ • ] [ 1. ] [ →] [ ← ] | [ " ] [ — ] | [ Color ▾ ] [ Resaltar ▾ ]
```

En iPad con pantalla táctil, los botones tienen un área mínima de 44x44px y la barra tiene scroll horizontal para acceder a todos los controles sin saturar la vista.

#### Comportamiento durante la predicación

- El formato del texto se convierte a HTML interno para su transmisión al intérprete a través del canal de datos.
- El intérprete ve exactamente el mismo formato que el predicador preparó: negritas, tamaños, listas, citas y colores de resaltado.
- El predicador puede activar el **modo edición en tiempo real** (F5) durante la predicación para hacer ajustes de formato sobre la marcha. Los cambios se sincronizan al intérprete en tiempo real.
- Las anotaciones de palabras clave (F10) son independientes del formato del editor y se superponen visualmente sobre el texto formateado.

#### Implementación técnica

El editor se implementa usando la API nativa del navegador `contenteditable` con comandos `document.execCommand()` como capa base, complementada con manipulación directa del DOM para las funciones que `execCommand` no cubre (sangría, bloques de cita, colores personalizados). El contenido se serializa como HTML sanitizado antes de almacenarse en IndexedDB o transmitirse por RTCDataChannel.

**Mensaje de protocolo (texto formateado):**
```json
{
  "type": "sermon",
  "format": "html",
  "paragraphs_es": ["<p><strong>Introducción</strong></p>", "<p>Texto con <em>cursiva</em>...</p>"],
  "paragraphs_en": ["<p><strong>Introduction</strong></p>", "<p>Text with <em>italics</em>...</p>"]
}
```

**Sanitización de seguridad:** Todo el HTML recibido por el intérprete pasa por un proceso de sanitización (whitelist de etiquetas permitidas: `p`, `strong`, `em`, `u`, `ul`, `ol`, `li`, `blockquote`, `hr`, `span` con atributos de estilo limitados) para prevenir la ejecución de código malicioso.

