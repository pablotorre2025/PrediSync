import { Mark, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    marginNote: {
      setMarginNote: (noteId: string) => ReturnType;
      unsetMarginNote: () => ReturnType;
    };
  }
}

/**
 * Mark TipTap que ancla un fragmento de texto a una anotación al margen.
 * Renderiza como <span class="margin-note-anchor" data-note-id="...">.
 */
export const MarginNote = Mark.create({
  name: 'marginNote',
  inclusive: false,
  spanning: false,

  addAttributes() {
    return {
      noteId: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-note-id'),
        renderHTML: (attrs) => attrs.noteId ? { 'data-note-id': attrs.noteId } : {}
      }
    };
  },

  parseHTML() {
    return [{ tag: 'span.margin-note-anchor' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'margin-note-anchor' }), 0];
  },

  addCommands() {
    return {
      setMarginNote: (noteId: string) => ({ commands }) => commands.setMark(this.name, { noteId }),
      unsetMarginNote: () => ({ commands }) => commands.unsetMark(this.name)
    };
  }
});
