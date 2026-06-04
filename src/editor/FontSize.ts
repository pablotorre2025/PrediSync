import { TextStyle } from '@tiptap/extension-text-style';
import { Mark } from '@tiptap/core';

/** Marca de tamaño de fuente arbitrario en px (no escalas predefinidas). */
export const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      fontSize: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).style.fontSize?.replace(/['"]+/g, '') || null,
        renderHTML: (attrs: any) => {
          if (!attrs.fontSize) return {};
          return { style: `font-size: ${attrs.fontSize}` };
        }
      }
    };
  }
});

export type FontSizeMark = typeof FontSize;
