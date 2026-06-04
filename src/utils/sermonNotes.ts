import type { Sermon, SermonPrivateNote } from '@/types';

export function getPrivateNotes(sermon: Sermon | null | undefined): SermonPrivateNote[] {
  if (!sermon) return [];
  if (sermon.notasPrivadasItems?.length) return sermon.notasPrivadasItems;
  const legacyText = sermon.notasPrivadas?.trim();
  if (!legacyText) return [];
  return [{
    id: 'legacy-private-note',
    texto: legacyText,
    createdAt: sermon.updatedAt,
  }];
}

export function shouldMigrateLegacyPrivateNotes(sermon: Sermon | null | undefined): sermon is Sermon {
  return Boolean(sermon?.notasPrivadas?.trim() && !sermon.notasPrivadasItems?.length);
}