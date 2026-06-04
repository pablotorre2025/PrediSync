import Dexie, { Table } from 'dexie';
import type { Sermon, SermonType, SmartLabel, BibleData, AppSettings, UserId, SermonVersion } from '@/types';

export interface KVRow {
  key: string;
  value: unknown;
}

class SermonDB extends Dexie {
  sermons!: Table<Sermon, string>;
  sermonVersions!: Table<SermonVersion, string>;
  sermonTypes!: Table<SermonType, string>;
  smartLabels!: Table<SmartLabel, string>;
  bibles!: Table<BibleData, string>;
  settings!: Table<{ userId: UserId; data: AppSettings; updatedAt?: number }, UserId>;
  kv!: Table<KVRow, string>;

  constructor() {
    super('sermon-maker-pro');
    this.version(1).stores({
      sermons: 'id, userId, updatedAt, status, favorito, tipo, serie, localDirty',
      sermonTypes: 'id, activo, builtin',
      smartLabels: 'id, orden, builtin',
      bibles: 'id, abbreviation, lang',
      settings: 'userId',
      kv: 'key'
    });
    this.version(2).stores({
      sermons: 'id, userId, updatedAt, status, favorito, tipo, serie, localDirty',
      sermonVersions: 'id, sermonId, userId, createdAt',
      sermonTypes: 'id, activo, builtin',
      smartLabels: 'id, orden, builtin',
      bibles: 'id, abbreviation, lang',
      settings: 'userId',
      kv: 'key'
    });
  }
}

export const localDB = new SermonDB();
