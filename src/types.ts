export type UserId = 'pablo' | 'saida';

export interface AppUser {
  id: UserId;
  name: string;
  /** Email mapeado internamente para Firebase Auth */
  email: string;
}

export interface TuHistoria {
  ejemploIA?: string;
  sugerencia?: string;
  categorias?: string[];
  textoUsuario?: string;
  privada?: boolean;
}

export interface SermonPoint {
  id: string;
  titulo: string;
  contenido: string; // HTML proseMirror
  tuHistoria?: TuHistoria;
}

export type SermonStatus = 'borrador' | 'listo' | 'predicado' | 'archivado';

export interface SermonPrivateNote {
  id: string;
  texto: string;
  createdAt: number;
}

export interface Sermon {
  id: string;
  userId: UserId;
  titulo: string;
  pasaje?: string;
  pasajeTexto?: string;
  pasajeVersion?: string;
  tipo: string; // id de SermonType
  tono?: string;
  audiencia?: string;
  velocidad?: number; // palabras por minuto
  contenidoHTML: string;
  notasPrivadas?: string; // legado: texto libre previo a notas privadas individuales
  notasPrivadasItems?: SermonPrivateNote[];
  anotacionesMargen?: { id: string; ancla: string; texto: string; createdAt: number }[];
  tags: string[];
  serie?: string;
  favorito: boolean;
  status: SermonStatus;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
  syncedAt?: number;
  remoteVersion?: number;
  localDirty: boolean;
}

export interface SermonVersion {
  id: string;
  sermonId: string;
  userId: UserId;
  titulo: string;
  contenidoHTML: string;
  createdAt: number;
  etiqueta?: string;
}

export interface SermonType {
  id: string;
  nombre: string;
  descripcion?: string;
  prompt: string;
  promptOriginal?: string;
  activo: boolean;
  builtin: boolean;
  incluirTuHistoria: boolean;
  puntosSugeridos: number;
}

export interface SmartLabel {
  id: string;
  nombre: string;
  color: string;
  builtin: boolean;
  orden: number;
}

export interface BibleBook {
  name: string;
  chapters: { verse: number; text: string }[][];
}

export interface BibleData {
  id: string;
  name: string;
  abbreviation: string;
  lang: string;
  books: BibleBook[];
}

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'offline' | 'error';

export type AIProvider = 'claude';

export interface AppSettings {
  theme: 'light' | 'dark';
  predFontFamily: string;
  predFontSizePx: number;
  wordsPerMinute: number;
  aiProvider: AIProvider;
  claudeApiKey?: string;
  defaultBibleId?: string;
  showAIExampleIfEmpty: boolean;
  ocultarNotasPrivadas: boolean;
}
