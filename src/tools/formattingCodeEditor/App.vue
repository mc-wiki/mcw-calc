<script setup lang="ts">
import CalcField from '@/components/CalcField.vue'
import {
  CdxToggleButtonGroup,
  CdxTab,
  CdxTabs,
  type ButtonGroupItem,
  CdxIcon,
  CdxSelect,
  type MenuItemData,
  CdxField,
  CdxTextArea,
  CdxButton,
} from '@wikimedia/codex'
import { useEditor, EditorContent, type JSONContent } from '@tiptap/vue-3'
import { Color } from '@tiptap/extension-color'
import Document from '@tiptap/extension-document'
import Text from '@tiptap/extension-text'
import Paragraph from '@tiptap/extension-paragraph'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Strike from '@tiptap/extension-strike'
import DropCursor from '@tiptap/extension-dropcursor'
import GapCursor from '@tiptap/extension-gapcursor'
import TextStyle from '@tiptap/extension-text-style'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  cdxIconBold,
  cdxIconCopy,
  cdxIconDie,
  cdxIconItalic,
  cdxIconPalette,
  cdxIconStrikethrough,
  cdxIconUnderline,
} from '@wikimedia/codex-icons'

const { t } = useI18n()

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
function hexColorToCode(rgb: string) {
  if (!rgb) {
    return 'none'
  }
  let hex: string

  if (rgb.startsWith('#')) {
    hex = rgb.toUpperCase()
  } else {
    hex =
      '#' +
      rgb
        .replace(/rgba?\(/, '')
        .split(/\s*,\s*/)
        .map((c) => parseInt(c).toString(16).padStart(2, '0').toUpperCase())
        .join('')
  }

  const color = activeColors.value.find((c) => c.foregroundHex === hex)

  return color ? color.code : 'none'
}

const colorItems = computed<MenuItemData[]>(() => [
  ...activeColors.value.map((color) => ({
    label: t(`formattingCodeEditor.color.${color.name}`),
    value: color.code,
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

const updateColor = (value: string) => {
  if (value === 'none') {
    editor.value?.chain().focus().unsetColor().run()
    return
  }
  editor.value
    ?.chain()
    .focus()
    .setColor(activeColors.value.find((c) => c.code === value)!.foregroundHex)
    .run()
}

const updateFormat = (value: string[]) => {
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

const editor = useEditor({
  content: `<p>Edit <u>me</u>!</p>
            <p>Try to <b>format</b> <i>this</i> <mark>text</mark>!</p>
            <p>Set me a <span style="color: #FF5555;">color</span>!</p>`,
  extensions: [
    Document,
    Text,
    Paragraph,
    TextStyle,
    Color,
    Highlight,
    Underline,
    Strike,
    Bold,
    Italic,
    DropCursor,
    GapCursor,
  ],
})

const textarea = ref<HTMLTextAreaElement | null>(null)

function JSONToFormatCode(json: JSONContent | undefined) {
  if (textarea.value) {
    const scrollHeight = textarea.value.scrollHeight - 4
    textarea.value.style.height = (scrollHeight > 300 ? 300 : scrollHeight) + 'px'
  }
  let code: string[] = []

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
        if (mark.type === 'underline') {
          prefixes.push('n')
        }
        if (mark.type === 'strike') {
          prefixes.push('m')
        }
        if (mark.type === 'highlight') {
          prefixes.push('k')
        }
        if (mark.type === 'textStyle') {
          const attrs = child.marks?.[0].attrs
          const color = activeColors.value.find((c) => c.foregroundHex === attrs?.color)

          if (color) {
            prefixes.push(color.code)
          }
        }
      }
      code.push(
        (prefixes.length === 0 ? '' : '§') +
          prefixes.join('§') +
          child.text +
          new Array(prefixes.length).fill('§r').join(''),
      )
    }
    code.push('\n')
  }

  return code.join('')
}
</script>
<template>
  <CalcField>
    <template #heading>{{ t('formattingCodeEditor.title') }}</template>
    <cdx-tabs v-model:active="edition" style="margin-bottom: 0.5rem">
      <cdx-tab name="java" :label="t('formattingCodeEditor.java')" />
      <cdx-tab name="bedrock" :label="t('formattingCodeEditor.bedrock')" />
    </cdx-tabs>
    <div style="display: flex; gap: 5px">
      <CdxSelect
        :selected="hexColorToCode(editor?.getAttributes('textStyle').color)"
        :menu-items="colorItems"
        @update:selected="updateColor"
        style="margin-bottom: 0.5rem"
      ></CdxSelect>
      <CdxToggleButtonGroup
        :model-value="activeFormatCodes"
        :buttons="formatButtons"
        @update:modelValue="updateFormat"
        style="margin-bottom: 0.5rem; overflow: visible"
      >
        <template #default="{ button }">
          <CdxIcon
            v-tooltip="button.ariaLabel"
            :icon="button.icon"
            :icon-label="button.ariaLabel"
          ></CdxIcon>
        </template>
      </CdxToggleButtonGroup>
    </div>

    <EditorContent class="fc-editor" style="margin-bottom: 0.5rem" :editor="editor" />

    <CdxField>
      <CdxTextArea v-model="formatCode" disabled />

      <template #label>
        <div style="display: flex; align-items: center">
          {{ t('formattingCodeEditor.output') }}
          <CdxButton style="margin-left: auto"
            ><CdxIcon :icon="cdxIconCopy" /> {{ t('formattingCodeEditor.copy') }}</CdxButton
          >
        </div>
      </template>
    </CdxField>
  </CalcField>
</template>
<style>
.fc-editor {
  font-family: 'Minecraft', monospace, sans-serif;
  background-color: var(--background-color-base, #fff);
  color: var(--color-base, #202122);
}

.fc-editor .tiptap {
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
</style>
