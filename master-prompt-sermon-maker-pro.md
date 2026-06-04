# Master Prompt — Sermon Maker Pro

Actúa como un arquitecto senior de software full stack, diseñador de producto experto en PWAs para iPad/iPhone, especialista en UX editorial, experto en integración con Firebase, experto en almacenamiento offline-first, experto en Claude Sonnet API, y además como un experto en Biblia, historia bíblica, hermenéutica, homilética y creación de predicaciones impactantes que toquen el corazón, sean bíblicamente sólidas, emocionalmente poderosas, pastoralmente útiles y estructuralmente profesionales.

Tu objetivo es diseñar y construir una aplicación PWA llamada **Sermon Maker Pro**. No debes omitir ningún requisito. Debes considerar que la aplicación será usada solo por dos personas, Pablo y Saida, no para venta pública ni para distribución masiva. Debe ser una herramienta privada, elegante, robusta, rápida, instalada como PWA, optimizada principalmente para iPad y iPhone, aunque con buen funcionamiento en escritorio.

## Objetivo general de la app

Crear una PWA premium para redactar, estructurar, guardar, organizar, generar y predicar sermones de manera profesional. La app debe combinar:

- Editor avanzado superior o comparable a Google Docs.
- Sistema profesional de estructura homilética.
- Modo predicación cómodo, visual y legible.
- Guardado offline-first con sincronización a la nube.
- Integración de IA con Claude Sonnet para generar sermones completos.
- Integración de Biblias JSON para consulta e inserción de citas bíblicas.
- Sistema de experiencias personales sugeridas para enriquecer cada punto del sermón.

## Arquitectura general requerida

La app debe ser una **PWA offline-first**.

### Flujo de persistencia de datos

El flujo correcto debe ser:

1. Guardar primero en almacenamiento local persistente del dispositivo.
2. Mantener el sermón disponible aun sin conexión a internet.
3. Sincronizar automáticamente con Firebase cuando haya conexión.
4. Tener respaldo local y respaldo en nube.

### Requisitos de guardado

- El guardado principal debe ser local primero.
- Después debe sincronizar con Firebase Firestore.
- Debe existir indicador visual de estado: guardado local, sin internet, sincronizando, sincronizado.
- Debe permitir exportar respaldo manual en JSON y PDF.
- El almacenamiento local no debe depender únicamente del browser de forma frágil; debe ser lo más persistente posible dentro del contexto PWA.

## Usuarios y autenticación

La app tendrá solamente dos usuarios:

- Pablo
- Saida

### Requisito de login

No usar experiencia visible de email para el usuario.
La experiencia de acceso debe ser extremadamente simple.

### Método de acceso requerido

Implementar pantalla de acceso con:

- Dos botones grandes con los nombres de usuario: **Pablo** y **Saida**.
- Al tocar uno, abrir acceso por PIN o clave simple.
- La interfaz debe ser amigable para usuarios con poco conocimiento técnico.
- Internamente puede mapear a credenciales de Firebase Auth, pero eso no debe ser visible para el usuario final.

### Regla de datos por usuario

- Cada usuario debe ver únicamente sus propios sermones.
- Cada usuario debe tener su propia colección o partición lógica en Firestore.
- La experiencia debe seguir siendo simple y privada.

## Firebase

El proyecto Firebase ya existe con esta configuración:

```js
const firebaseConfig = {
  apiKey: "AIzaSyBAvFtYjRMMGCccaE2ZPvzqBPB54J0tKW4",
  authDomain: "sermon-maker-pro.firebaseapp.com",
  projectId: "sermon-maker-pro",
  storageBucket: "sermon-maker-pro.firebasestorage.app",
  messagingSenderId: "751573116871",
  appId: "1:751573116871:web:63b1d8831949af9650dbe2"
};
```

La app debe usar Firebase para:

- Authentication
- Firestore
- sincronización de sermones
- configuración por usuario
- estado de sincronización

## API de IA

La app debe integrar Claude Sonnet mediante API de Anthropic.

### Requisito crítico de seguridad

La API key nunca debe exponerse en el frontend en producción. Debes diseñar la solución con una capa segura tipo backend/serverless proxy para llamadas a Anthropic. Aunque el usuario haya compartido una clave durante la planeación, la implementación correcta debe protegerla y evitar dejarla embebida en el cliente.

### Función del módulo IA

La IA debe poder generar sermones completos usando prompts configurables por tipo de sermón.

Debe:

- Generar estructura completa del sermón.
- Insertar automáticamente los puntos en el editor.
- Soportar más de 4 puntos, sin límite rígido pequeño.
- Respetar la estructura del tipo de sermón seleccionado.
- Producir introducción, desarrollo, puntos, ilustraciones, aplicaciones, conclusión, oración y bloques de apoyo.
- Generar contenido impactante, bíblico, pastoral, claro y emocionalmente poderoso.

## Tipos de sermón requeridos

La app debe incluir como mínimo estos tipos de sermón preconfigurados:

1. Expositivo
2. Temático
3. Doctrinal
4. Homilético deductivo
5. Inductivo
6. Narrativo
7. Evangelístico
8. Devocional
9. Apologético
10. Profético
11. Didáctico
12. Litúrgico o sacramental
13. Misiológico

También debe permitir:

- crear tipos personalizados,
- editar prompts de cada tipo,
- restaurar prompts predeterminados,
- clonar prompts,
- desactivar tipos que no se usen.

## Prompts maestros por tipo de sermón

Cada tipo de sermón debe traer un prompt profesional editable. Deben estar guardados en una sección de configuración. A continuación se establecen los prompts base.

### 1. Expositivo

```text
Eres un predicador experto en homilética expositiva, hermenéutica bíblica e historia bíblica. Genera un sermón expositivo completo, profundo, bíblicamente fiel, pastoralmente poderoso y emocionalmente impactante basado en el pasaje: {PASAJE}. Sigue el flujo natural del texto bíblico, respetando contexto histórico, literario y teológico.

Estructura requerida:
- Título poderoso
- Introducción que conecte con el corazón
- Contexto histórico y bíblico
- Idea central del pasaje
- Desarrollo por secciones o movimientos del texto
- Puntos del sermón, tantos como sean necesarios según el pasaje
- Explicación bíblica clara en cada punto
- Aplicación práctica por punto
- Ilustración o ejemplo de vida real por punto
- Bloque Tu Historia por punto
- Conclusión poderosa
- Llamado final
- Oración final

El tono debe ser {TONO}. La audiencia es {AUDIENCIA}. La velocidad estimada es {VELOCIDAD}. Debe tocar el corazón sin sacrificar profundidad bíblica.
```

### 2. Temático

```text
Eres un experto en predicación temática, Biblia, doctrina y comunicación pastoral. Genera un sermón temático completo sobre: {TEMA}. Usa múltiples pasajes bíblicos de apoyo, desarrolla una tesis clara, y organiza el mensaje con progresión lógica, fuerza pastoral y aplicaciones concretas.

Incluye:
- Título
- Introducción con conexión emocional y relevancia actual
- Tesis central
- Puntos principales, tantos como sean necesarios
- Versículos de apoyo
- Ilustraciones reales
- Aplicaciones específicas
- Bloque Tu Historia en cada punto
- Conclusión y oración
```

### 3. Doctrinal

```text
Eres un teólogo pastoral y predicador experimentado. Genera un sermón doctrinal claro, edificante y profundo sobre: {TEMA}. Debe explicar doctrina con fidelidad bíblica, claridad comprensible y aplicación a la vida diaria.

Incluye:
- Definición doctrinal
- Base bíblica principal
- Desarrollo doctrinal progresivo
- Objeciones o confusiones comunes
- Aplicación espiritual
- Ilustraciones reales
- Bloque Tu Historia por cada punto
- Conclusión y oración
```

### 4. Homilético deductivo

```text
Eres un experto en homilética clásica deductiva. Genera un sermón donde la proposición central se declare al principio y luego se desarrolle mediante puntos sólidos, persuasivos y memorables sobre: {TEMA_O_PASAJE}.

Incluye:
- Título
- Proposición central
- Introducción
- Puntos que sustenten la proposición
- Aplicación e ilustración por punto
- Bloque Tu Historia por punto
- Recapitulación
- Conclusión
- Oración
```

### 5. Inductivo

```text
Eres un predicador experto en método inductivo. Genera un sermón inductivo que guíe a la audiencia desde observaciones, tensión y descubrimiento hasta la verdad central sobre: {PASAJE_O_TEMA}. Debe crear interés progresivo, participación mental y revelación final.

Incluye observaciones, progresión, ejemplos reales, aplicaciones, Bloque Tu Historia por punto, conclusión y oración.
```

### 6. Narrativo

```text
Eres un predicador narrativo experto en storytelling bíblico. Genera un sermón narrativo inmersivo, visual y emocionalmente poderoso basado en: {PASAJE}. Debe trasladar a la audiencia dentro de la historia y conectar la narrativa con la vida actual.

Incluye escenas, conflicto, clímax, resolución, aplicaciones, ejemplos reales, Bloque Tu Historia por escena o punto, conclusión y oración.
```

### 7. Evangelístico

```text
Eres un evangelista experto. Genera un sermón evangelístico claro, urgente, amoroso y centrado en Cristo sobre: {TEMA_O_PASAJE}. Debe mostrar la necesidad humana, la obra de Cristo, la respuesta de fe y un llamado final claro.

Incluye puntos, ejemplos de vida real, aplicaciones directas, Bloque Tu Historia por punto, llamado a decisión, oración de fe y próximos pasos.
```

### 8. Devocional

```text
Eres un pastor con sensibilidad devocional. Genera un sermón devocional cálido, profundo, bíblico e íntimo sobre: {TEMA_O_PASAJE}. Debe nutrir el alma, invitar a la reflexión y producir cercanía con Dios.

Incluye meditaciones, pausas reflexivas, ejemplo real, Bloque Tu Historia, aplicación espiritual, conclusión y oración contemplativa.
```

### 9. Apologético

```text
Eres un apologeta cristiano experto. Genera un sermón apologético sólido, accesible y persuasivo sobre: {TEMA}. Debe responder objeciones reales, mostrar fundamentos bíblicos e intelectuales, y conducir del argumento a la fe personal.

Incluye objeciones, respuestas, evidencias, aplicaciones, ejemplos reales, Bloque Tu Historia por punto, conclusión y oración.
```

### 10. Profético

```text
Eres un predicador profético, firme y lleno de gracia. Genera un sermón profético que confronte con verdad y amor sobre: {TEMA_O_PASAJE}. Debe llamar al arrepentimiento, mostrar esperanza y proponer restauración.

Incluye diagnóstico, consecuencias, llamado, misericordia, ejemplos reales, Bloque Tu Historia por punto, conclusión y oración de arrepentimiento.
```

### 11. Didáctico

```text
Eres un maestro bíblico experto. Genera un sermón didáctico claro, ordenado y profundo sobre: {TEMA_O_PASAJE}. Debe enseñar con precisión y también mover a la obediencia.

Incluye definiciones, lecciones, errores comunes, aplicaciones, ejemplos reales, Bloque Tu Historia por punto, síntesis final y oración.
```

### 12. Litúrgico o sacramental

```text
Eres un ministro cristiano experto en liturgia. Genera un sermón litúrgico o sacramental apropiado para la ocasión: {OCASION}. Debe ser solemne, pastoral, bíblico y profundamente significativo.

Incluye apertura, lectura, significado espiritual, exhortación, palabras pastorales, ejemplos reales aplicables, Bloque Tu Historia, bendición y oración.
```

### 13. Misiológico

```text
Eres un predicador con visión misionera global. Genera un sermón misiológico apasionado, bíblico y movilizador sobre: {TEMA_O_PASAJE}. Debe encender el corazón por la misión de Dios.

Incluye visión bíblica, urgencia, ejemplos reales, llamado práctico, Bloque Tu Historia por punto, conclusión y oración misionera.
```

## Bloque obligatorio “Tu Historia”

En cada punto del sermón debe existir un bloque llamado **Tu Historia**.

### Este bloque debe incluir

1. Un ejemplo de vida real generado por IA.
2. Una sugerencia de qué tipo de experiencia personal del predicador podría insertarse ahí.
3. Categorías sugeridas para encontrar una experiencia apropiada.
4. Un espacio editable para que Pablo o Saida escriban su experiencia.
5. Opción para marcar esa experiencia como privada o visible en modo predicación.

### Categorías sugeridas de experiencias

- Familia
- Matrimonio
- Hijos
- Ministerio
- Iglesia
- Trabajo
- Finanzas
- Salud
- Crisis
- Fe
- Servicio
- Relaciones
- Pruebas
- Milagros
- Pérdidas
- Restauración

### Comportamiento

- En el editor se ven sugerencias IA y campo editable.
- En modo predicación se muestra solo lo necesario según configuración.
- Si el usuario no escribió nada, opcionalmente puede mostrarse el ejemplo IA como apoyo.

## Editor principal

El editor debe ser de nivel premium y superior o comparable a Google Docs.

### Funciones básicas

- negrita
- cursiva
- subrayado
- tachado
- títulos H1, H2, H3 y más niveles si hace falta
- alineación izquierda, centro, derecha y justificada
- listas con viñetas
- listas numeradas
- checklist
- color de texto
- color de resaltado
- deshacer y rehacer

### Tipografías

Debe permitir al menos 15 tipos de letra seleccionables.

Ejemplos recomendados:
- Merriweather
- Lora
- Playfair Display
- EB Garamond
- Crimson Pro
- Source Serif 4
- Inter
- Work Sans
- Nunito
- Raleway
- Open Sans
- Libre Baskerville
- Spectral
- DM Serif Display
- PT Serif

### Tamaño de texto

Debe poder cambiarse en **px** mediante control directo.
No solo escalas predefinidas. Debe permitir, por ejemplo, 12px, 14px, 18px, 22px, 28px, 32px y otros valores.

### Funciones avanzadas

- tablas
- imágenes
- hipervínculos
- bloques de cita bíblica con diseño especial
- notas privadas
- anotaciones al margen
- búsqueda dentro del sermón
- historial de versiones

## Smart Labels o etiquetas inteligentes

Debe existir un sistema profesional de smart labels para insertar bloques estructurales en el sermón con un toque.

### Requisito

Al tocar una etiqueta, debe insertarse automáticamente un bloque con estilo visual, color y título editable.

### Labels mínimas

- Introducción
- Texto base
- Punto
- Subpunto
- Ilustración
- Cita bíblica
- Aplicación
- Llamado
- Conclusión
- Oración
- Transición
- Testimonio
- Contexto histórico
- Nota pastoral
- Personalizado

### Reglas

- El sermón puede tener más de 4 puntos.
- No limitar la estructura a 3 puntos clásicos.
- Permitir tantos puntos y subpuntos como el usuario necesite.
- Cada bloque debe poder tener color distintivo.
- Los colores deben mantenerse o reflejarse en el modo predicación para distinguir visualmente las partes del sermón.

## Estimación automática de duración

La app debe calcular la duración estimada de la predicación conforme se escribe el sermón.

### Requisitos

- Calcular palabras por minuto.
- Permitir configurar velocidad personal de predicación.
- Mostrar tiempo estimado en tiempo real.
- Debe actualizarse automáticamente mientras el sermón crece o cambia.

## Integración de Biblia JSON

La app debe permitir cargar y usar Biblias en formato JSON.

Ya se analizó una Biblia con esta estructura:

- `name`
- `abbreviation`
- `lang`
- `books[]`
- cada libro tiene `name` y `chapters[]`
- cada capítulo es un array de objetos con `verse` y `text`

### Requisitos del módulo Biblia

- Cargar una o varias Biblias JSON.
- Buscar por libro, capítulo y versículo.
- Buscar por texto.
- Insertar pasajes en el editor con formato bonito.
- Poder elegir versión bíblica.
- Limpiar saltos de línea y notas si hace falta.
- Mostrar contexto de pasaje.
- Integrar citas bíblicas dentro del generador de sermones IA.

## Modo Predicación

El modo predicación debe ser muy agradable a la vista, altamente legible y optimizado para lectura pública.

### Requisitos de UX

- Pantalla completa.
- Sin distracciones.
- Navegación por páginas o paneles.
- No usar slider para tamaño.
- Usar botones grandes **+** y **-** para aumentar o disminuir tamaño de fuente.
- No usar scroll automático.
- Poder navegar por secciones del sermón.
- Dividir por smart labels o bloques mayores.
- Mostrar progreso entre paneles o secciones.
- Mantener colores visuales de las secciones.
- Alto contraste y tipografía muy legible.
- Ocultar notas privadas automáticamente.
- Mantener despierta la pantalla durante la predicación cuando sea posible.

## Dashboard de sermones

La app debe tener un panel principal donde se puedan:

- ver todos los sermones del usuario,
- buscar sermones,
- filtrar por etiquetas,
- ordenar por fecha,
- marcar favoritos,
- organizar por series o carpetas,
- ver estado del sermón: borrador, listo, predicado,
- duplicar sermones,
- archivar sermones.

## Configuración

Debe existir un módulo de configuración con estas secciones:

### Configuración general
- tema claro/oscuro
- tamaño y fuente por defecto en predicación
- velocidad de palabras por minuto
- preferencias visuales

### Configuración de IA
- lista de tipos de sermón
- editor de prompts por tipo
- crear prompt nuevo
- restaurar prompt original
- probar prompt
- activar o desactivar secciones automáticas
- configurar si incluye Tu Historia
- configurar cantidad sugerida de puntos

### Configuración de Biblias
- cargar JSON
- eliminar JSON
- elegir versión por defecto

### Configuración de smart labels
- crear etiquetas nuevas
- renombrarlas
- cambiar color
- reordenarlas

## Diseño visual y técnico

La app debe verse premium, moderna, sobria, ministerial, limpia y fácil de leer.

### Diseño deseado

- elegante
- profesional
- sin aspecto genérico
- optimizada para iPad/iPhone
- buen modo oscuro
- excelente legibilidad
- interfaz intuitiva para personas no técnicas

### Requisitos técnicos sugeridos

- React + Vite
- PWA con manifest y service worker
- Firebase Auth y Firestore
- almacenamiento offline-first
- IndexedDB para caché local y trabajo sin conexión
- sincronización en background
- editor rico basado en un motor serio como TipTap o equivalente profesional
- arquitectura modular

## Seguridad

- No exponer secretos sensibles en frontend.
- Proteger la API de Claude detrás de una capa segura.
- Reglas de Firestore privadas por usuario.
- Manejar errores y conflictos de sincronización.

## Entregables esperados del proyecto

La solución final debe incluir:

- estructura completa del proyecto
- componentes de UI
- editor
- dashboard
- modo predicación
- integración Firebase
- integración IA
- reglas de Firestore
- configuración editable
- manejo de Biblias JSON
- prompts base configurados
- diseño PWA instalable
- documentación clara

## Regla final

No omitas nada de lo establecido en este documento. Si hace falta ampliar módulos, hazlo, pero no simplifiques los requisitos. La app debe sentirse como una herramienta ministerial premium, privada, profundamente útil, espiritualmente seria y técnicamente robusta.
