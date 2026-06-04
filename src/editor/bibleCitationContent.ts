import type { Editor, JSONContent } from '@tiptap/core';
import type { Node as ProseMirrorNode, Schema } from '@tiptap/pm/model';

const BIBLE_CITATION_COLOR = '#6d28d9';
const BIBLE_CITATION_LABELS = new Set(['cita', 'cita biblica', 'cita bíblica']);
const MAX_VERSE_RANGE = 176;

export function buildBibleCitationSmartBlock(ref: string, text: string): JSONContent {
  return {
    type: 'smartBlock',
    attrs: {
      labelId: 'cita-biblica',
      label: 'Cita bíblica',
      color: BIBLE_CITATION_COLOR,
      titulo: ref,
    },
    content: [
      {
        type: 'paragraph',
        content: buildBibleCitationInlineContent(ref, text),
      },
    ],
  };
}

export function normalizeLegacyBibleCitations(editor: Editor): boolean {
  const { schema } = editor.state;
  const smartBlockType = schema.nodes.smartBlock;
  const paragraphType = schema.nodes.paragraph;
  const verseNumberType = schema.nodes.bibleVerseNumber;

  if (!smartBlockType || !paragraphType || !verseNumberType) return false;

  let transaction = editor.state.tr;
  let changed = false;

  editor.state.doc.descendants((node, position) => {
    if (node.type !== smartBlockType) return true;

    const label = String(node.attrs.label ?? '').toLowerCase();
    if (!BIBLE_CITATION_LABELS.has(label)) return false;

    const ref = String(node.attrs.titulo ?? '');
    const expectedVerseNumbers = parseBibleCitationVerseNumbers(ref);
    if (expectedVerseNumbers.length === 0) return false;

    node.forEach((childNode, childOffset) => {
      if (!childNode.isTextblock) return;
      if (paragraphAlreadyNormalized(childNode, verseNumberType.name)) return;

      const inlineContent = buildBibleCitationProseContent(schema, ref, childNode.textContent);
      if (!inlineContent.length) return;

      const from = transaction.mapping.map(position + childOffset + 1);
      const to = transaction.mapping.map(position + childOffset + childNode.nodeSize);
      const replacement = paragraphType.create(childNode.attrs, inlineContent, childNode.marks);
      transaction = transaction.replaceWith(from, to, replacement);
      changed = true;
    });

    return false;
  });

  if (!changed) return false;
  editor.view.dispatch(transaction);
  return true;
}

export function parseBibleCitationVerseNumbers(ref: string): string[] {
  const match = ref.match(/\b\d+:(\d+)(?:-(\d+))?/);
  if (!match) return [];

  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : start;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) return [];

  const safeEnd = Math.min(end, start + MAX_VERSE_RANGE);
  const values: string[] = [];
  for (let verse = start; verse <= safeEnd; verse += 1) {
    values.push(String(verse));
  }
  return values;
}

export function buildBibleCitationInlineContent(ref: string, text: string): JSONContent[] {
  const verseNumbers = parseBibleCitationVerseNumbers(ref);
  if (verseNumbers.length === 0) {
    return text ? [{ type: 'text', text }] : [];
  }

  const parts: JSONContent[] = [];
  let cursor = 0;
  let verseIndex = 0;
  const matches = text.matchAll(/\b\d+\b/g);

  for (const match of matches) {
    if (verseIndex >= verseNumbers.length || match.index === undefined) break;

    const value = match[0];
    if (value !== verseNumbers[verseIndex]) continue;

    if (match.index > cursor) {
      parts.push({ type: 'text', text: text.slice(cursor, match.index) });
    }

    parts.push({
      type: 'bibleVerseNumber',
      attrs: { value },
    });

    cursor = match.index + value.length;
    verseIndex += 1;
  }

  if (cursor < text.length) {
    parts.push({ type: 'text', text: text.slice(cursor) });
  }

  if (!parts.some(part => part.type === 'bibleVerseNumber')) {
    return mergeAdjacentTextNodes([
      {
        type: 'bibleVerseNumber',
        attrs: { value: verseNumbers[0] },
      },
      ...(text ? [{ type: 'text', text: ` ${text}` }] : []),
    ]);
  }

  return mergeAdjacentTextNodes(parts);
}

function buildBibleCitationProseContent(schema: Schema, ref: string, text: string): ProseMirrorNode[] {
  return buildBibleCitationInlineContent(ref, text).flatMap(part => {
    if (part.type === 'text') {
      const value = part.text ?? '';
      return value ? [schema.text(value)] : [];
    }

    if (part.type === 'bibleVerseNumber') {
      return [schema.nodes.bibleVerseNumber.create(part.attrs ?? {})];
    }

    return [];
  });
}

function mergeAdjacentTextNodes(parts: JSONContent[]): JSONContent[] {
  const merged: JSONContent[] = [];

  for (const part of parts) {
    if (part.type === 'text' && part.text) {
      const previous = merged[merged.length - 1];
      if (previous?.type === 'text') {
        previous.text = `${previous.text ?? ''}${part.text}`;
        continue;
      }
    }
    merged.push(part);
  }

  return merged;
}

function paragraphAlreadyNormalized(node: ProseMirrorNode, verseNumberNodeName: string): boolean {
  let normalized = false;
  node.descendants(descendant => {
    if (descendant.type.name === verseNumberNodeName) {
      normalized = true;
      return false;
    }
    return true;
  });
  return normalized;
}
