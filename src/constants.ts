import type { SermonType, SmartLabel } from './types';

export const APP_VERSION = '1.060';

export const DEFAULT_USERS = [
  { id: 'pablo' as const, name: 'Pablo', email: 'pablo@sermonmaker.local' },
  { id: 'saida' as const, name: 'Saida', email: 'saida@reset-20260530.sermonmaker.local' }
];

export const FONT_FAMILIES = [
  'Merriweather',
  'Lora',
  'Playfair Display',
  'EB Garamond',
  'Crimson Pro',
  'Source Serif 4',
  'Inter',
  'Work Sans',
  'Nunito',
  'Raleway',
  'Open Sans',
  'Libre Baskerville',
  'Spectral',
  'DM Serif Display',
  'PT Serif'
];

export const EXPERIENCE_CATEGORIES = [
  'Familia', 'Matrimonio', 'Hijos', 'Ministerio', 'Iglesia', 'Trabajo',
  'Finanzas', 'Salud', 'Crisis', 'Fe', 'Servicio', 'Relaciones',
  'Pruebas', 'Milagros', 'Pérdidas', 'Restauración'
];

export const BUILTIN_SMART_LABELS: SmartLabel[] = [
  { id: 'introduccion', nombre: 'Introducción', color: '#6b8e6e', builtin: true, orden: 1 },
  { id: 'texto-base', nombre: 'Texto base', color: '#4a6fa5', builtin: true, orden: 2 },
  { id: 'punto', nombre: 'Punto', color: '#8a2f2a', builtin: true, orden: 3 },
  { id: 'subpunto', nombre: 'Subpunto', color: '#b08a4a', builtin: true, orden: 4 },
  { id: 'ilustracion', nombre: 'Ilustración', color: '#d97706', builtin: true, orden: 5 },
  { id: 'cita-biblica', nombre: 'Cita bíblica', color: '#6d28d9', builtin: true, orden: 6 },
  { id: 'aplicacion', nombre: 'Aplicación', color: '#2563eb', builtin: true, orden: 7 },
  { id: 'llamado', nombre: 'Llamado', color: '#be123c', builtin: true, orden: 8 },
  { id: 'conclusion', nombre: 'Conclusión', color: '#475569', builtin: true, orden: 9 },
  { id: 'oracion', nombre: 'Oración', color: '#7c3aed', builtin: true, orden: 10 },
  { id: 'transicion', nombre: 'Transición', color: '#94a3b8', builtin: true, orden: 11 },
  { id: 'testimonio', nombre: 'Testimonio', color: '#0891b2', builtin: true, orden: 12 },
  { id: 'contexto-historico', nombre: 'Contexto histórico', color: '#65a30d', builtin: true, orden: 13 },
  { id: 'nota-pastoral', nombre: 'Nota pastoral', color: '#ea580c', builtin: true, orden: 14 },
  { id: 'tu-historia', nombre: 'Tu Historia', color: '#c2410c', builtin: true, orden: 15 },
  { id: 'personalizado', nombre: 'Personalizado', color: '#6b7280', builtin: true, orden: 99 }
];

const PROMPTS = {
  expositivo: `Eres el motor exegético de una aplicación profesional para pastores. Tu objetivo es redactar un sermón EXPOSITIVO profundo, erudito y pastoral para aproximadamente una hora de predicación.

<entrada_usuario>
Pasaje: {PASAJE}
Tema de apoyo: {TEMA_O_PASAJE}
Tono: {TONO}
Audiencia: {AUDIENCIA}
Velocidad estimada: {VELOCIDAD}
</entrada_usuario>

<instrucciones_de_logica>
Extrae la estructura directamente del orden del pasaje. Sigue el flujo del texto bíblico, respeta contexto histórico, literario y teológico, y usa RVR1960 o NVI como referencia de versículos si necesitas citarlos.
</instrucciones_de_logica>

<instrucciones_de_contenido>
- Genera un título atractivo.
- Incluye introducción, contexto histórico y literario, e idea exegética central.
- Divide el pasaje en 3 o 4 bloques de versículos o movimientos naturales.
- Para cada bloque desarrolla análisis del texto, una raíz original cuando aporte valor, ilustración, aplicación congregacional y Bloque Tu Historia.
- Concluye unificando la enseñanza y cerrando con llamado y oración.
- Mantén un tono {TONO}, pastoralmente poderoso, bíblicamente fiel y emocionalmente impactante.
</instrucciones_de_contenido>`,

  tematico: `Eres el motor teológico de una aplicación profesional para pastores. Tu objetivo es redactar un sermón TEMÁTICO sistemático, claro y pastoral.

<entrada_usuario>
Tema: {TEMA}
Pasaje ancla opcional: {PASAJE}
Tono: {TONO}
Audiencia: {AUDIENCIA}
</entrada_usuario>

<instrucciones_de_contenido>
- Desarrolla una tesis central fuerte.
- Usa un texto ancla y múltiples pasajes bíblicos de apoyo.
- Presenta el problema humano contemporáneo y cómo Dios responde a él.
- Genera 3 o 4 puntos que exploren distintos ángulos del tema.
- Para cada punto incluye fundamento bíblico, historia bíblica de apoyo, ilustración del mundo real, aplicación práctica y Bloque Tu Historia.
- Cierra con recapitulación, llamado y oración.
</instrucciones_de_contenido>`,

  textual: `Eres el motor homilético de una aplicación profesional para pastores. Tu tarea es redactar un sermón TEXTUAL profundo y claro.

<entrada_usuario>
Versículo o pasaje breve: {PASAJE_O_TEMA}
Tono: {TONO}
Audiencia: {AUDIENCIA}
</entrada_usuario>

<instrucciones_de_logica>
Selecciona un solo versículo o una unidad textual breve. Los puntos del sermón deben surgir de las frases literales del versículo.
</instrucciones_de_logica>

<instrucciones_de_contenido>
- Introducción que presente la belleza y contexto del texto.
- Divide el versículo en 3 o 4 frases clave.
- Para cada frase desarrolla profundidad teológica, textos cruzados, ilustración, aplicación y Bloque Tu Historia.
- Termina releyendo el texto completo y uniendo toda la enseñanza en el llamado final.
</instrucciones_de_contenido>`,

  biografico: `Eres el motor narrativo y pastoral de una aplicación profesional para pastores. Tu objetivo es redactar un sermón BIOGRÁFICO inmersivo y espiritualmente profundo.

<entrada_usuario>
Personaje o pasaje biográfico: {PASAJE_O_TEMA}
Tono: {TONO}
Audiencia: {AUDIENCIA}
</entrada_usuario>

<instrucciones_de_logica>
Identifica al personaje bíblico, traza su arco narrativo y muestra su llamado, sus fallas, su proceso con Dios y su legado, apuntando siempre a la gracia de Dios y a Cristo.
</instrucciones_de_logica>

<instrucciones_de_contenido>
- Presenta al personaje como humano real, no como superhéroe.
- Divide su vida en 3 o 4 etapas o lecciones clave.
- En cada etapa incluye relato bíblico, análisis psicológico/espiritual, espejo contemporáneo, aplicación práctica y Bloque Tu Historia.
- Concluye mostrando el legado del personaje y cómo revela la necesidad de Cristo.
</instrucciones_de_contenido>`,

  doctrinal: `Eres un teólogo pastoral y predicador experimentado. Genera un sermón doctrinal claro, edificante y profundo sobre: {TEMA}. Debe explicar doctrina con fidelidad bíblica, claridad comprensible y aplicación a la vida diaria.

Incluye:
- Definición doctrinal
- Base bíblica principal
- Desarrollo doctrinal progresivo
- Objeciones o confusiones comunes
- Aplicación espiritual
- Ilustraciones reales
- Bloque Tu Historia por cada punto
- Conclusión y oración`,

  deductivo: `Eres un experto en homilética clásica deductiva. Genera un sermón donde la proposición central se declare al principio y luego se desarrolle mediante puntos sólidos, persuasivos y memorables sobre: {TEMA_O_PASAJE}.

Incluye:
- Título
- Proposición central
- Introducción
- Puntos que sustenten la proposición
- Aplicación e ilustración por punto
- Bloque Tu Historia por punto
- Recapitulación
- Conclusión
- Oración`,

  inductivo: `Eres un predicador experto en método inductivo. Genera un sermón inductivo que guíe a la audiencia desde observaciones, tensión y descubrimiento hasta la verdad central sobre: {PASAJE_O_TEMA}. Debe crear interés progresivo, participación mental y revelación final.

Incluye observaciones, progresión, ejemplos reales, aplicaciones, Bloque Tu Historia por punto, conclusión y oración.`,

  narrativo: `Eres un predicador narrativo experto en storytelling bíblico. Genera un sermón narrativo inmersivo, visual y emocionalmente poderoso basado en: {PASAJE}. Debe trasladar a la audiencia dentro de la historia y conectar la narrativa con la vida actual.

Incluye escenas, conflicto, clímax, resolución, aplicaciones, ejemplos reales, Bloque Tu Historia por escena o punto, conclusión y oración.`,

  evangelistico: `Eres el motor evangelístico de una aplicación profesional para pastores. Redacta un sermón EVANGELÍSTICO persuasivo, empático y cristocéntrico.

<entrada_usuario>
Tema o pasaje: {TEMA_O_PASAJE}
Tono: {TONO}
Audiencia: {AUDIENCIA}
</entrada_usuario>

<instrucciones_de_logica>
El objetivo es llevar a personas no creyentes a la fe. Evita jerga religiosa innecesaria y comunica con claridad.
</instrucciones_de_logica>

<instrucciones_de_contenido>
- Introducción conectada con una necesidad humana universal: culpa, soledad, miedo, vacío o desesperanza.
- Desarrolla el mensaje en cuatro movimientos: diseño y ruina, incapacidad humana, rescate en la cruz e invitación de la gracia.
- Usa ejemplos de vida real y aplicaciones directas.
- Incluye llamado al altar o a la decisión, oración de fe sugerida y próximos pasos.
</instrucciones_de_contenido>`,

  devocional: `Eres un pastor con sensibilidad devocional. Genera un sermón devocional cálido, profundo, bíblico e íntimo sobre: {TEMA_O_PASAJE}. Debe nutrir el alma, invitar a la reflexión y producir cercanía con Dios.

Incluye meditaciones, pausas reflexivas, ejemplo real, Bloque Tu Historia, aplicación espiritual, conclusión y oración contemplativa.`,

  apologetico: `Eres el motor apologético de una aplicación profesional para pastores. Redacta un sermón APOLOGÉTICO estructurado, lógico y compasivo, diseñado para dudar de las dudas.

<entrada_usuario>
Pregunta, duda o tema: {TEMA}
Pasaje base opcional: {PASAJE}
Tono: {TONO}
Audiencia: {AUDIENCIA}
</entrada_usuario>

<instrucciones_de_logica>
Responde preguntas culturales, filosóficas o científicas con rigor intelectual y sensibilidad pastoral. Puedes apoyarte en pensadores cristianos como C.S. Lewis o Tim Keller cuando aporte valor.
</instrucciones_de_logica>

<instrucciones_de_contenido>
- Introducción que valide la duda con empatía.
- Genera 3 puntos que presenten la perspectiva secular, la respuesta lógica cristiana y la respuesta bíblica.
- Incluye citas o referencias de autoridad, aplicación al corazón y Bloque Tu Historia cuando sea útil.
- Termina aterrizando la defensa intelectual en adoración, confianza y llamado a Jesús.
</instrucciones_de_contenido>`,

  profetico: `Eres un predicador profético, firme y lleno de gracia. Genera un sermón profético que confronte con verdad y amor sobre: {TEMA_O_PASAJE}. Debe llamar al arrepentimiento, mostrar esperanza y proponer restauración.

Incluye diagnóstico, consecuencias, llamado, misericordia, ejemplos reales, Bloque Tu Historia por punto, conclusión y oración de arrepentimiento.`,

  didactico: `Eres un maestro bíblico experto. Genera un sermón didáctico claro, ordenado y profundo sobre: {TEMA_O_PASAJE}. Debe enseñar con precisión y también mover a la obediencia.

Incluye definiciones, lecciones, errores comunes, aplicaciones, ejemplos reales, Bloque Tu Historia por punto, síntesis final y oración.`,

  liturgico: `Eres el motor de eventos especiales de una aplicación profesional para pastores. Redacta un sermón OCASIONAL para una festividad o ceremonia.

<entrada_usuario>
Ocasión: {OCASION}
Pasaje ancla: {PASAJE_O_TEMA}
Tono: {TONO}
Audiencia: {AUDIENCIA}
</entrada_usuario>

<instrucciones_de_logica>
Analiza si la ocasión sugiere celebración, consuelo, bendición o exhortación. Adapta radicalmente el tono según el evento.
</instrucciones_de_logica>

<instrucciones_de_contenido>
- Reconoce el momento y las emociones de los asistentes.
- Desarrolla 2 o 3 puntos con significado espiritual, historia bíblica y palabras de instrucción o consuelo.
- Incluye Bloque Tu Historia cuando aporte cercanía pastoral.
- Cierra con bendición final y oración adaptada a la ocasión.
</instrucciones_de_contenido>`,

  ocasional: `Eres el motor de eventos especiales de una aplicación profesional para pastores. Redacta un sermón OCASIONAL para festividades, bodas, funerales, Día de la Madre, Navidad, Resurrección u otros momentos especiales.

<entrada_usuario>
Ocasión: {OCASION}
Pasaje ancla: {PASAJE_O_TEMA}
Tono: {TONO}
Audiencia: {AUDIENCIA}
</entrada_usuario>

<instrucciones_de_contenido>
- Haz un reconocimiento claro del momento y de las emociones presentes.
- Mantén el sermón más breve y enfocado que uno regular.
- Genera 2 o 3 puntos con significado espiritual, historia bíblica de apoyo, palabras de instrucción o consuelo y Bloque Tu Historia cuando ayude.
- Concluye con una bendición pastoral y oración final totalmente adaptadas a la ocasión.
</instrucciones_de_contenido>`,

  misiologico: `Eres un predicador con visión misionera global. Genera un sermón misiológico apasionado, bíblico y movilizador sobre: {TEMA_O_PASAJE}. Debe encender el corazón por la misión de Dios.

Incluye visión bíblica, urgencia, ejemplos reales, llamado práctico, Bloque Tu Historia por punto, conclusión y oración misionera.`
};

export const BUILTIN_SERMON_TYPES: SermonType[] = [
  { id: 'expositivo', nombre: 'Expositivo', descripcion: 'Sigue el flujo natural del texto bíblico.', prompt: PROMPTS.expositivo, promptOriginal: PROMPTS.expositivo, activo: true, builtin: true, incluirTuHistoria: true, puntosSugeridos: 4 },
  { id: 'tematico', nombre: 'Temático', descripcion: 'Desarrolla una tesis central con múltiples pasajes.', prompt: PROMPTS.tematico, promptOriginal: PROMPTS.tematico, activo: true, builtin: true, incluirTuHistoria: true, puntosSugeridos: 4 },
  { id: 'textual', nombre: 'Textual', descripcion: 'Desarrolla el sermón desde las frases de un solo versículo.', prompt: PROMPTS.textual, promptOriginal: PROMPTS.textual, activo: true, builtin: true, incluirTuHistoria: true, puntosSugeridos: 3 },
  { id: 'biografico', nombre: 'Biográfico', descripcion: 'Extrae lecciones del proceso de un personaje bíblico.', prompt: PROMPTS.biografico, promptOriginal: PROMPTS.biografico, activo: true, builtin: true, incluirTuHistoria: true, puntosSugeridos: 4 },
  { id: 'doctrinal', nombre: 'Doctrinal', descripcion: 'Explica doctrina con fidelidad bíblica.', prompt: PROMPTS.doctrinal, promptOriginal: PROMPTS.doctrinal, activo: true, builtin: true, incluirTuHistoria: true, puntosSugeridos: 4 },
  { id: 'deductivo', nombre: 'Homilético deductivo', descripcion: 'Proposición central declarada al inicio.', prompt: PROMPTS.deductivo, promptOriginal: PROMPTS.deductivo, activo: true, builtin: true, incluirTuHistoria: true, puntosSugeridos: 4 },
  { id: 'inductivo', nombre: 'Inductivo', descripcion: 'Guía desde observaciones hasta verdad central.', prompt: PROMPTS.inductivo, promptOriginal: PROMPTS.inductivo, activo: true, builtin: true, incluirTuHistoria: true, puntosSugeridos: 4 },
  { id: 'narrativo', nombre: 'Narrativo', descripcion: 'Storytelling bíblico inmersivo.', prompt: PROMPTS.narrativo, promptOriginal: PROMPTS.narrativo, activo: true, builtin: true, incluirTuHistoria: true, puntosSugeridos: 4 },
  { id: 'evangelistico', nombre: 'Evangelístico', descripcion: 'Centrado en Cristo con llamado claro.', prompt: PROMPTS.evangelistico, promptOriginal: PROMPTS.evangelistico, activo: true, builtin: true, incluirTuHistoria: true, puntosSugeridos: 4 },
  { id: 'devocional', nombre: 'Devocional', descripcion: 'Cálido, íntimo, contemplativo.', prompt: PROMPTS.devocional, promptOriginal: PROMPTS.devocional, activo: true, builtin: true, incluirTuHistoria: true, puntosSugeridos: 3 },
  { id: 'apologetico', nombre: 'Apologético', descripcion: 'Responde objeciones con evidencia.', prompt: PROMPTS.apologetico, promptOriginal: PROMPTS.apologetico, activo: true, builtin: true, incluirTuHistoria: true, puntosSugeridos: 4 },
  { id: 'profetico', nombre: 'Profético', descripcion: 'Confronta con verdad y amor.', prompt: PROMPTS.profetico, promptOriginal: PROMPTS.profetico, activo: true, builtin: true, incluirTuHistoria: true, puntosSugeridos: 4 },
  { id: 'didactico', nombre: 'Didáctico', descripcion: 'Enseña con precisión y orden.', prompt: PROMPTS.didactico, promptOriginal: PROMPTS.didactico, activo: true, builtin: true, incluirTuHistoria: true, puntosSugeridos: 4 },
  { id: 'liturgico', nombre: 'Litúrgico o sacramental', descripcion: 'Solemne y significativo para ocasiones.', prompt: PROMPTS.liturgico, promptOriginal: PROMPTS.liturgico, activo: true, builtin: true, incluirTuHistoria: true, puntosSugeridos: 3 },
  { id: 'ocasional', nombre: 'Ocasión especial', descripcion: 'Adaptado para bodas, funerales y festividades.', prompt: PROMPTS.ocasional, promptOriginal: PROMPTS.ocasional, activo: true, builtin: true, incluirTuHistoria: true, puntosSugeridos: 3 },
  { id: 'misiologico', nombre: 'Misiológico', descripcion: 'Enciende el corazón por la misión.', prompt: PROMPTS.misiologico, promptOriginal: PROMPTS.misiologico, activo: true, builtin: true, incluirTuHistoria: true, puntosSugeridos: 4 }
];

export const DEFAULT_SETTINGS = {
  theme: 'light' as const,
  predFontFamily: 'Lora',
  predFontSizePx: 30,
  wordsPerMinute: 130,
  aiProvider: 'claude' as const,
  claudeApiKey: '',
  showAIExampleIfEmpty: true,
  ocultarNotasPrivadas: true
};
