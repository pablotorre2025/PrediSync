import { localDB } from '@/storage/db';
import { uploadBible, removeBibleFromCloud } from '@/storage/bibleSync';
import type { BibleData, UserId } from '@/types';
import { nanoid } from 'nanoid';

const BIBLE_SEARCH_STOP_WORDS = new Set([
  'a', 'al', 'de', 'del', 'el', 'ella', 'ellas', 'ellos', 'en', 'es', 'la', 'las',
  'le', 'les', 'lo', 'los', 'mi', 'mis', 'o', 'os', 'se', 'si', 'sin', 'su', 'sus',
  'te', 'tu', 'tus', 'un', 'una', 'uno', 'unos', 'unas', 'y', 'ya', 'yo'
]);

export type BibleSearchMode = 'phrase' | 'terms';

export interface BibleHighlightRange {
  start: number;
  end: number;
}

export interface BibleTextSearchResult {
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
  matchMode: BibleSearchMode;
  matchedTerms: string[];
  highlights: BibleHighlightRange[];
}

export interface BibleTextSearchResponse {
  matchMode: BibleSearchMode | null;
  results: BibleTextSearchResult[];
}

/** Importa una Biblia en formato JSON al almacenamiento local y la sube a la nube. */
export async function importBibleFromJSON(file: File, userId?: UserId): Promise<BibleData> {
  const text = await file.text();
  let raw: any;
  try { raw = JSON.parse(text); } catch { throw new Error('Archivo JSON inválido.'); }
  if (!raw.books || !Array.isArray(raw.books)) throw new Error('Estructura JSON no compatible.');
  const bible: BibleData = {
    id: raw.id ?? raw.abbreviation ?? nanoid(),
    name: raw.name ?? 'Biblia',
    abbreviation: raw.abbreviation ?? '',
    lang: raw.lang ?? 'es',
    books: raw.books
  };
  await localDB.bibles.put(bible);
  if (userId) {
    try { await uploadBible(bible, userId); } catch (e) { console.warn('No se pudo subir la Biblia a la nube:', e); }
  }
  return bible;
}

export async function listBibles(): Promise<BibleData[]> {
  return localDB.bibles.toArray();
}

export async function deleteBible(id: string, userId?: UserId): Promise<void> {
  await localDB.bibles.delete(id);
  if (userId) {
    try { await removeBibleFromCloud(id, userId); } catch (e) { console.warn('No se pudo eliminar la Biblia de la nube:', e); }
  }
}

export async function getBible(id: string): Promise<BibleData | undefined> {
  return localDB.bibles.get(id);
}

/** Busca por libro, capítulo, versículo. Devuelve texto formateado o null. */
export function getPassage(bible: BibleData, bookName: string, chapter: number, verseStart: number, verseEnd?: number): { ref: string; text: string } | null {
  const book = bible.books.find(b => b.name.toLowerCase() === bookName.toLowerCase());
  if (!book) return null;
  const ch = book.chapters[chapter - 1];
  if (!ch) return null;
  const end = verseEnd ?? verseStart;
  const verses = ch.filter(v => v.verse >= verseStart && v.verse <= end);
  if (verses.length === 0) return null;
  const text = verses.map(v => `${v.verse} ${cleanVerse(v.text)}`).join(' ');
  const refRange = verseStart === end ? `${verseStart}` : `${verseStart}-${end}`;
  return { ref: `${book.name} ${chapter}:${refRange} (${bible.abbreviation || bible.name})`, text };
}

/** Busca texto en toda la Biblia (limita a 50 resultados). */
export function searchText(bible: BibleData, queryStr: string, limit = 50): { ref: string; text: string }[] {
  return searchBibleTextDetailed(bible, queryStr, limit).results.map(result => ({
    ref: `${result.bookName} ${result.chapter}:${result.verse} (${bible.abbreviation || bible.name})`,
    text: `${result.verse} ${result.text}`,
  }));
}

export function searchBibleTextDetailed(bible: BibleData, queryStr: string, limit = 60): BibleTextSearchResponse {
  const normalizedQuery = normalizeBibleSearchText(queryStr);
  const queryTerms = tokenizeBibleSearchQuery(queryStr);
  if (!normalizedQuery) return { matchMode: null, results: [] };

  const phraseResults: BibleTextSearchResult[] = [];
  const termCandidates: Array<BibleTextSearchResult & { score: number; order: number }> = [];
  let order = 0;

  for (const book of bible.books) {
    for (let c = 0; c < book.chapters.length; c++) {
      for (const v of book.chapters[c]) {
        const verseText = cleanVerse(v.text);
        const indexed = buildBibleSearchIndex(verseText);
        const phraseHighlights = buildHighlightRanges(indexed, [normalizedQuery]);
        if (phraseHighlights.length > 0) {
          phraseResults.push({
            bookName: book.name,
            chapter: c + 1,
            verse: v.verse,
            text: verseText,
            matchMode: 'phrase',
            matchedTerms: [normalizedQuery],
            highlights: phraseHighlights,
          });
          if (phraseResults.length >= limit) {
            return { matchMode: 'phrase', results: phraseResults };
          }
          continue;
        }

        const matchedTerms = queryTerms.filter(term => indexed.normalized.includes(term));
        if (matchedTerms.length === 0) continue;

        termCandidates.push({
          bookName: book.name,
          chapter: c + 1,
          verse: v.verse,
          text: verseText,
          matchMode: 'terms',
          matchedTerms,
          highlights: buildHighlightRanges(indexed, matchedTerms),
          score: matchedTerms.length,
          order: order++,
        });
      }
    }
  }

  if (phraseResults.length > 0) {
    return { matchMode: 'phrase', results: phraseResults.slice(0, limit) };
  }

  termCandidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.order - b.order;
  });

  return {
    matchMode: termCandidates.length > 0 ? 'terms' : null,
    results: termCandidates.slice(0, limit).map(({ score: _score, order: _order, ...result }) => result),
  };
}

export function normalizeBibleSearchText(text: string): string {
  return cleanVerse(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanVerse(t: string): string {
  return t.replace(/\s+/g, ' ').replace(/\[(.*?)\]/g, '').trim();
}

function tokenizeBibleSearchQuery(text: string): string[] {
  return Array.from(
    new Set(
      normalizeBibleSearchText(text)
        .split(' ')
        .filter(term => term.length > 2)
        .filter(term => !BIBLE_SEARCH_STOP_WORDS.has(term))
    )
  );
}

function buildBibleSearchIndex(text: string): { source: string; normalized: string; map: number[] } {
  const source = cleanVerse(text);
  let normalized = '';
  const map: number[] = [];

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    const normalizedChars = char
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    let appendedAlphaNumeric = false;
    for (const normalizedChar of normalizedChars) {
      if (/[a-z0-9]/.test(normalizedChar)) {
        normalized += normalizedChar;
        map.push(i);
        appendedAlphaNumeric = true;
      }
    }

    if (!appendedAlphaNumeric && normalized && normalized[normalized.length - 1] !== ' ') {
      normalized += ' ';
      map.push(i);
    }
  }

  if (normalized.endsWith(' ')) {
    normalized = normalized.slice(0, -1);
    map.pop();
  }

  return { source, normalized, map };
}

function buildHighlightRanges(indexed: { source: string; normalized: string; map: number[] }, terms: string[]): BibleHighlightRange[] {
  const ranges: BibleHighlightRange[] = [];

  for (const term of terms) {
    if (!term) continue;
    let fromIndex = 0;
    while (fromIndex < indexed.normalized.length) {
      const matchIndex = indexed.normalized.indexOf(term, fromIndex);
      if (matchIndex === -1) break;
      const endIndex = matchIndex + term.length;
      const start = indexed.map[matchIndex];
      const end = indexed.map[endIndex - 1] + 1;
      ranges.push({ start, end });
      fromIndex = matchIndex + term.length;
    }
  }

  return mergeHighlightRanges(ranges);
}

function mergeHighlightRanges(ranges: BibleHighlightRange[]): BibleHighlightRange[] {
  if (ranges.length <= 1) return ranges;

  const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: BibleHighlightRange[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const previous = merged[merged.length - 1];
    if (current.start <= previous.end) {
      previous.end = Math.max(previous.end, current.end);
      continue;
    }
    merged.push({ ...current });
  }

  return merged;
}
