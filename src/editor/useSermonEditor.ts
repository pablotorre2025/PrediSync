import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import FontFamily from '@tiptap/extension-font-family';
import { FontSize } from './FontSize';
import { SmartBlock } from './SmartBlock';
import { MarginNote } from './MarginNote';
import { BibleVerseNumber } from './BibleVerseNumber';
import { normalizeLegacyBibleCitations } from './bibleCitationContent';

export function useSermonEditor(initialHTML: string, onUpdate: (html: string) => void): Editor | null {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      FontSize,
      FontFamily,
      Color,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      SmartBlock,
      MarginNote,
      BibleVerseNumber
    ],
    content: initialHTML || '<p></p>',
    onCreate: ({ editor }) => {
      normalizeLegacyBibleCitations(editor);
    },
    onUpdate: ({ editor }) => onUpdate(editor.getHTML())
  });
  return editor;
}
