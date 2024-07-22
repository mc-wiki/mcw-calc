import { Mark, getMarkAttributes, mergeAttributes } from '@tiptap/core'

export interface TextClassOptions {
  /**
   * HTML attributes to add to the span element.
   * @default {}
   * @example { class: 'foo' }
   */
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textClass: {
      /**
       * Remove spans without inline class attributes.
       * @example editor.commands.removeEmptyTextClass()
       */
      removeEmptyTextClass: () => ReturnType
    }
  }
}

/**
 * This extension allows you to create text classes.
 */
export const TextClass = Mark.create<TextClassOptions>({
  name: 'textClass',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: (element) => {
          const hasClasses = (element as HTMLElement).hasAttribute('class')

          if (!hasClasses) {
            return false
          }

          return {}
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addCommands() {
    return {
      removeEmptyTextClass:
        () =>
        ({ state, commands }) => {
          const attributes = getMarkAttributes(state, this.type)
          const hasClasses = Object.entries(attributes).some(([, value]) => !!value)

          if (hasClasses) {
            return true
          }

          return commands.unsetMark(this.name)
        },
    }
  },
})
