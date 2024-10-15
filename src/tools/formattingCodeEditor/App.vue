<script setup lang="ts">
import CalcField from '@/components/CalcField.vue'
import Bold from '@tiptap/extension-bold'
import Document from '@tiptap/extension-document'
import DropCursor from '@tiptap/extension-dropcursor'
import GapCursor from '@tiptap/extension-gapcursor'
import Highlight from '@tiptap/extension-highlight'
import Italic from '@tiptap/extension-italic'
import Paragraph from '@tiptap/extension-paragraph'
import Strike from '@tiptap/extension-strike'
import Text from '@tiptap/extension-text'
import TextStyle from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import { EditorContent, type JSONContent, useEditor } from '@tiptap/vue-3'
import {
  type ButtonGroupItem,
  CdxButton,
  CdxField,
  CdxIcon,
  CdxSelect,
  CdxTab,
  CdxTabs,
  CdxTextArea,
  CdxToggleButtonGroup,
  type MenuItemData,
} from '@wikimedia/codex'
import {
  cdxIconBold,
  cdxIconCopy,
  cdxIconDie,
  cdxIconItalic,
  cdxIconPalette,
  cdxIconStrikethrough,
  cdxIconUnderline,
} from '@wikimedia/codex-icons'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ColorClass } from './color-class'
import { TextClass } from './text-class'

const { t } = useI18n()

const editor = useEditor({
  content: `<p>${t('formattingCodeEditor.default.1', {
    underline: `<u>${t('formattingCodeEditor.default.1.underline')}</u>`,
    bold: `<b>${t('formattingCodeEditor.default.1.bold')}</b>`,
    italic: `<i>${t('formattingCodeEditor.default.1.italic')}</i>`,
    obfuscated: `<mark>${t('formattingCodeEditor.default.1.obfuscated')}</mark>`,
  })}</p>

    <p>${t('formattingCodeEditor.default.2', {
      color: `<span class="color-red">${t('formattingCodeEditor.default.2.color')}</span>`,
    })}</p>`,
  extensions: [
    Document,
    Text,
    Paragraph,
    TextStyle,
    TextClass,
    ColorClass,
    Highlight,
    Underline,
    Strike,
    Bold,
    Italic,
    DropCursor,
    GapCursor,
  ],
})

interface Code {
  code: string
  name: string
}

interface CodeColor extends Code {
  foregroundHex: string
  backgroundHex: string
}

const javaColors: CodeColor[] = [
  {
    code: '0',
    name: 'black',
    foregroundHex: '#000000',
    backgroundHex: '#000000',
  },
  {
    code: '1',
    name: 'dark_blue',
    foregroundHex: '#0000AA',
    backgroundHex: '#00002A',
  },
  {
    code: '2',
    name: 'dark_green',
    foregroundHex: '#00AA00',
    backgroundHex: '#002A00',
  },
  {
    code: '3',
    name: 'dark_aqua',
    foregroundHex: '#00AAAA',
    backgroundHex: '#002A2A',
  },
  {
    code: '4',
    name: 'dark_red',
    foregroundHex: '#AA0000',
    backgroundHex: '#2A0000',
  },
  {
    code: '5',
    name: 'dark_purple',
    foregroundHex: '#AA00AA',
    backgroundHex: '#2A002A',
  },
  {
    code: '6',
    name: 'gold',
    foregroundHex: '#FFAA00',
    backgroundHex: '#2A2A00',
  },
  {
    code: '7',
    name: 'gray',
    foregroundHex: '#AAAAAA',
    backgroundHex: '#2A2A2A',
  },
  {
    code: '8',
    name: 'dark_gray',
    foregroundHex: '#555555',
    backgroundHex: '#151515',
  },
  {
    code: '9',
    name: 'blue',
    foregroundHex: '#5555FF',
    backgroundHex: '#15153F',
  },
  {
    code: 'a',
    name: 'green',
    foregroundHex: '#55FF55',
    backgroundHex: '#153F15',
  },
  {
    code: 'b',
    name: 'aqua',
    foregroundHex: '#55FFFF',
    backgroundHex: '#153F3F',
  },
  {
    code: 'c',
    name: 'red',
    foregroundHex: '#FF5555',
    backgroundHex: '#3F1515',
  },
  {
    code: 'd',
    name: 'light_purple',
    foregroundHex: '#FF55FF',
    backgroundHex: '#3F153F',
  },
  {
    code: 'e',
    name: 'yellow',
    foregroundHex: '#FFFF55',
    backgroundHex: '#3F3F15',
  },
  {
    code: 'f',
    name: 'white',
    foregroundHex: '#FFFFFF',
    backgroundHex: '#3F3F3F',
  },
]

const bedrockColors: CodeColor[] = [
  ...javaColors.filter((c) => c.name !== 'gold'),
  {
    ...javaColors.find((c) => c.name === 'gold')!,
    backgroundHex: '#402A00',
  },
  {
    code: 'g',
    name: 'minecoin_gold',
    foregroundHex: '#DDD605',
    backgroundHex: '#373501',
  },
  {
    code: 'h',
    name: 'material_quartz',
    foregroundHex: '#E3D4D1',
    backgroundHex: '#383534',
  },
  {
    code: 'i',
    name: 'material_iron',
    foregroundHex: '#CECACA',
    backgroundHex: '#333232',
  },
  {
    code: 'j',
    name: 'material_netherite',
    foregroundHex: '#443A3B',
    backgroundHex: '#110E0E',
  },
  {
    code: 'm',
    name: 'material_redstone',
    foregroundHex: '#971607',
    backgroundHex: '#250501',
  },
  {
    code: 'n',
    name: 'material_copper',
    foregroundHex: '#B4684D',
    backgroundHex: '#2D1A13',
  },
  {
    code: 'p',
    name: 'material_gold',
    foregroundHex: '#DEB12D',
    backgroundHex: '#372C0B',
  },
  {
    code: 'q',
    name: 'material_emerald',
    foregroundHex: '#47A036',
    backgroundHex: '#04280D',
  },
  {
    code: 's',
    name: 'material_diamond',
    foregroundHex: '#2CBAA8',
    backgroundHex: '#0B2E2A',
  },
  {
    code: 't',
    name: 'material_lapis',
    foregroundHex: '#21497B',
    backgroundHex: '#08121E',
  },
  {
    code: 'u',
    name: 'material_amethyst',
    foregroundHex: '#9A5CC6',
    backgroundHex: '#261731',
  },
]

const edition = ref<'java' | 'bedrock'>('java')
const activeColors = computed(() => (edition.value === 'java' ? javaColors : bedrockColors))

const colorItems = computed<MenuItemData[]>(() => [
  ...activeColors.value.map((color) => ({
    label: t(`formattingCodeEditor.color.${color.name}`),
    value: color.name,
    icon: `
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="20" height="20" viewBox="0 0 20 20">
        <rect width="20" height="20" fill="${color.foregroundHex}" stroke="${color.backgroundHex}" stroke-width="2" />
      </svg>
    `,
  })),
  {
    label: t(`formattingCodeEditor.color.none`),
    value: 'none',
    icon: cdxIconPalette,
  },
])

const formatButtons = computed<ButtonGroupItem[]>(() => [
  {
    ariaLabel: t('formattingCodeEditor.format.bold'),
    label: '',
    value: 'l',
    icon: cdxIconBold,
  },
  {
    ariaLabel: t('formattingCodeEditor.format.italic'),
    label: '',
    value: 'o',
    icon: cdxIconItalic,
  },

  {
    ariaLabel: t('formattingCodeEditor.format.obfuscated'),
    label: '',
    value: 'k',
    icon: cdxIconDie,
  },
  ...(edition.value === 'java'
    ? [
        {
          ariaLabel: t('formattingCodeEditor.format.strikethrough'),
          label: '',
          value: 'm',
          icon: cdxIconStrikethrough,
        },
        {
          ariaLabel: t('formattingCodeEditor.format.underline'),
          label: '',
          value: 'n',
          icon: cdxIconUnderline,
        },
      ]
    : []),
])

const formatCode = computed(() => JSONToFormatCode(editor.value?.getJSON()))
const activeFormatCodes = computed(() => {
  const formatCodes: string[] = []
  if (editor.value?.isActive('bold')) {
    formatCodes.push('l')
  }
  if (editor.value?.isActive('italic')) {
    formatCodes.push('o')
  }
  if (editor.value?.isActive('underline')) {
    formatCodes.push('n')
  }
  if (editor.value?.isActive('strike')) {
    formatCodes.push('m')
  }
  if (editor.value?.isActive('highlight')) {
    formatCodes.push('k')
  }

  return formatCodes
})

function updateColor(value: string) {
  if (value === 'none') {
    editor.value?.chain().focus().unsetColor().run()
    return
  }
  editor.value?.chain().focus().setColor(value).run()
}

function updateFormat(value: string[]) {
  editor.value
    ?.chain()
    .focus()
    .unsetBold()
    .unsetItalic()
    .unsetUnderline()
    .unsetStrike()
    .unsetHighlight()
    .run()
  if (value.includes('l')) {
    editor.value?.chain().focus().toggleBold().run()
  }
  if (value.includes('o')) {
    editor.value?.chain().focus().toggleItalic().run()
  }
  if (value.includes('n')) {
    editor.value?.chain().focus().toggleUnderline().run()
  }
  if (value.includes('m')) {
    editor.value?.chain().focus().toggleStrike().run()
  }
  if (value.includes('k')) {
    editor.value?.chain().focus().toggleHighlight().run()
  }
}

const textarea = ref<HTMLTextAreaElement | null>(null)

function JSONToFormatCode(json: JSONContent | undefined) {
  if (textarea.value) {
    const scrollHeight = textarea.value.scrollHeight - 4
    textarea.value.style.height = `${scrollHeight > 300 ? 300 : scrollHeight}px`
  }
  const code: string[] = []

  for (const para of json?.content ?? []) {
    for (const child of para?.content ?? []) {
      const prefixes: string[] = []
      for (const mark of child.marks ?? []) {
        if (mark.type === 'bold') {
          prefixes.push('l')
        }
        if (mark.type === 'italic') {
          prefixes.push('o')
        }
        if (mark.type === 'underline' && edition.value === 'java') {
          prefixes.push('n')
        }
        if (mark.type === 'strike' && edition.value === 'java') {
          prefixes.push('m')
        }
        if (mark.type === 'highlight') {
          prefixes.push('k')
        }
        if (mark.type === 'textClass') {
          const attrs = child.marks?.[0].attrs
          const color = activeColors.value.find((c) => c.name === attrs?.colorClass)

          if (color) {
            prefixes.push(color.code)
          }
        }
      }
      code.push(
        (prefixes.length === 0 ? '' : '§') +
          prefixes.join('§') +
          child.text +
          Array.from({ length: prefixes.length }).fill('§r').join(''),
      )
    }
    code.push('\n')
  }

  return code.join('')
}
</script>

<template>
  <CalcField>
    <template #heading>
      {{ t('formattingCodeEditor.title') }}
    </template>
    <CdxTabs v-model:active="edition" style="margin-bottom: 0.5rem">
      <CdxTab name="java" :label="t('formattingCodeEditor.java')" />
      <CdxTab name="bedrock" :label="t('formattingCodeEditor.bedrock')" />
    </CdxTabs>
    <div style="display: flex; gap: 5px">
      <CdxSelect
        :selected="editor?.getAttributes('textClass').colorClass ?? 'none'"
        :menu-items="colorItems"
        style="margin-bottom: 0.5rem"
        @update:selected="updateColor"
      />
      <CdxToggleButtonGroup
        :model-value="activeFormatCodes"
        :buttons="formatButtons"
        style="margin-bottom: 0.5rem; overflow: visible"
        @update:model-value="updateFormat"
      >
        <template #default="{ button }">
          <CdxIcon
            v-tooltip:top="button.ariaLabel"
            :icon="button.icon"
            :icon-label="button.ariaLabel"
          />
        </template>
      </CdxToggleButtonGroup>
    </div>

    <EditorContent
      class="fc-editor"
      :class="[edition]"
      style="margin-bottom: 0.5rem"
      :editor="editor"
    />

    <CdxField>
      <CdxTextArea v-model="formatCode" disabled />

      <template #label>
        <div style="display: flex; align-items: center">
          {{ t('formattingCodeEditor.output') }}
          <CdxButton style="margin-left: auto">
            <CdxIcon :icon="cdxIconCopy" /> {{ t('formattingCodeEditor.copy') }}
          </CdxButton>
        </div>
      </template>
    </CdxField>
  </CalcField>
</template>

<style lang="less">
.cdx-toggle-button-group,
.cdx-toggle-button {
  overflow: visible;
}

.cdx-select-vue__handle {
  min-width: 175px;
  display: flex;
  align-items: center;
}

.fc-editor {
  font-family: 'Minecraft', monospace, sans-serif;
  background-color: var(--background-color-base, #fff);
  color: var(--color-base, #202122);
}

.fc-editor .tiptap {
  max-height: 300px;
  overflow-y: auto;
  outline: none;
  padding: 4px 8px;
  border-color: var(--border-color-base, #a2a9b1);
  border-width: 1px;
  border-style: solid;
  border-radius: 2px;
  box-shadow: inset 0 0 0 1px var(--box-shadow-color-transparent, transparent);
  transition-property: background-color, color, border-color, box-shadow;
  transition-duration: 0.25s;
}

.fc-editor .tiptap:hover {
  border-color: var(--border-color-interactive, #72777d);
}

.fc-editor .tiptap:focus {
  border-color: var(--border-color-progressive--focus, #36c);
  box-shadow: inset 0 0 0 1px var(--box-shadow-color-progressive--focus, #36c);
}

.fc-editor p {
  margin: 0;
}

.cdx-text-area__textarea {
  font-family: monospace;
  resize: none;
}

@font-pixel: (1 / 5ex);

.fc-editor {
  strong {
    font-weight: normal;
    text-shadow: @font-pixel 0px;
    letter-spacing: @font-pixel;
  }

  u,
  s {
    text-decoration-thickness: @font-pixel;
  }

  em {
    -webkit-font-smoothing: none;
    -moz-osx-font-smoothing: none;
  }

  .color-black {
    color: #000000;
  }

  .color-dark_blue {
    color: #0000aa;
  }

  .color-dark_green {
    color: #00aa00;
  }

  .color-dark_aqua {
    color: #00aaaa;
  }

  .color-dark_red {
    color: #aa0000;
  }

  .color-dark_purple {
    color: #aa00aa;
  }

  .color-gold {
    color: #ffaa00;
  }

  .color-gray {
    color: #aaaaaa;
  }

  .color-dark_gray {
    color: #555555;
  }

  .color-blue {
    color: #5555ff;
  }

  .color-green {
    color: #55ff55;
  }

  .color-aqua {
    color: #55ffff;
  }

  .color-red {
    color: #ff5555;
  }

  .color-light_purple {
    color: #ff55ff;
  }

  .color-yellow {
    color: #ffff55;
  }

  .color-white {
    color: #ffffff;
  }

  &.bedrock {
    .color-minecoin_gold {
      color: #ddd605;
    }

    .color-material_quartz {
      color: #e3d4d1;
    }

    .color-material_iron {
      color: #cecaca;
    }

    .color-material_netherite {
      color: #443a3b;
    }

    .color-material_redstone {
      color: #971607;
    }

    .color-material_copper {
      color: #b4684d;
    }

    .color-material_gold {
      color: #deb12d;
    }

    .color-material_emerald {
      color: #47a036;
    }

    .color-material_diamond {
      color: #2cbaa8;
    }

    .color-material_lapis {
      color: #21497b;
    }

    .color-material_amethyst {
      color: #9a5cc6;
    }

    s {
      text-decoration: none;
    }

    u {
      text-decoration: none;
    }
  }
}
</style>
