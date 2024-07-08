import './text-class'

import { Extension } from '@tiptap/core'

export type ColorOptions = {
  /**
   * The types where the color can be applied
   * @default ['textClass']
   * @example ['heading', 'paragraph']
   */
  types: string[]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    colorClass: {
      /**
       * Set the text color
       * @param colorClass The color to set
       * @example editor.commands.setColor('red')
       */
      setColor: (colorClass: string) => ReturnType

      /**
       * Unset the text color
       * @example editor.commands.unsetColor()
       */
      unsetColor: () => ReturnType
    }
  }
}

/**
 * This extension allows you to color your text.
 */
export const ColorClass = Extension.create<ColorOptions>({
  name: 'color-class',

  addOptions() {
    return {
      types: ['textClass'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          colorClass: {
            default: null,
            parseHTML(element): string | null {
              for (const key of element.classList) {
                if (key.startsWith('color-')) {
                  return key.replace('color-', '')
                }
              }

              return null
            },
            renderHTML: (attributes) => {
              if (!attributes.colorClass) {
                return {}
              }

              return {
                class: `color-${attributes.colorClass}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setColor:
        (colorClass) =>
        ({ chain }) => {
          console.log('color', colorClass)
          return chain().setMark('textClass', { colorClass }).run()
        },
      unsetColor:
        () =>
        ({ chain }) => {
          return chain().setMark('textClass', { colorClass: null }).removeEmptyTextClass().run()
        },
    }
  },
})
