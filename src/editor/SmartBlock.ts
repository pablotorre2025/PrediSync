import { Node, mergeAttributes } from '@tiptap/core';
import { BUILTIN_SMART_LABELS } from '@/constants';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    smartBlock: {
      insertSmartBlock: (labelId: string, opts?: { titulo?: string; texto?: string }) => ReturnType;
    };
  }
}

/**
 * Bloque estructural (smart label) — Punto, Ilustración, Cita, Tu Historia, etc.
 * Se serializa como <div class="smart-block" data-label="..." data-color="...">.
 * Es editable internamente y mantiene su color en modo predicación.
 */
export const SmartBlock = Node.create({
  name: 'smartBlock',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: false,

  addAttributes() {
    return {
      labelId: { default: 'punto' },
      label: { default: 'Punto' },
      color: { default: '#8a2f2a' },
      titulo: { default: '' }
    };
  },

  parseHTML() {
    return [{
      tag: 'div.smart-block',
      contentElement: '.smart-block-body',
      getAttrs: (el) => {
        const dom = el as HTMLElement;
        return {
          labelId: dom.getAttribute('data-label-id') || 'punto',
          label: dom.getAttribute('data-label') || 'Punto',
          color: dom.getAttribute('data-color') || '#8a2f2a',
          titulo: dom.getAttribute('data-titulo') || ''
        };
      }
    }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = mergeAttributes(HTMLAttributes, {
      class: 'smart-block',
      'data-label-id': node.attrs.labelId,
      'data-label': node.attrs.label?.toLowerCase?.() ?? '',
      'data-color': node.attrs.color,
      'data-titulo': node.attrs.titulo,
      style: `--label-color:${node.attrs.color}`
    });
    return ['div', attrs,
      ['div', { class: 'smart-block-header', contenteditable: 'false' },
        node.attrs.titulo ? `${node.attrs.label} — ${node.attrs.titulo}` : node.attrs.label
      ],
      ['div', { class: 'smart-block-body' }, 0]
    ];
  },

  addCommands() {
    return {
      insertSmartBlock: (labelId, opts) => ({ chain }) => {
        const label = BUILTIN_SMART_LABELS.find(l => l.id === labelId)
          ?? BUILTIN_SMART_LABELS.find(l => l.id === 'personalizado')!;
        const innerHTML = opts?.texto ?? '<p></p>';
        return chain().insertContent({
          type: this.name,
          attrs: {
            labelId: label.id,
            label: label.nombre,
            color: label.color,
            titulo: opts?.titulo ?? ''
          },
          content: [{ type: 'paragraph', content: opts?.texto ? [{ type: 'text', text: opts.texto }] : [] }]
        }).focus().run();
      }
    };
  }
});
