import { Node } from '@tiptap/core';

export const BibleVerseNumber = Node.create({
  name: 'bibleVerseNumber',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      value: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span.bible-verse-num',
        getAttrs: element => ({ value: (element as HTMLElement).textContent?.trim() ?? '' }),
      },
      {
        tag: 'sup',
        getAttrs: element => ({ value: (element as HTMLElement).textContent?.trim() ?? '' }),
      },
    ];
  },

  renderHTML({ node }) {
    return ['span', { class: 'bible-verse-num', 'data-verse-num': node.attrs.value }, String(node.attrs.value ?? '')];
  },
});
