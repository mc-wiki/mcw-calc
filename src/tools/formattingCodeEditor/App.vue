<script setup lang="ts">
import Field from '@/components/Field.vue'
import { CdxToggleButtonGroup, CdxTab, CdxTabs } from '@wikimedia/codex'
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

interface Code {
  code: string
  name: string
  display: string
}

interface CodeColor extends Code {
  foregroundHex: string
  backgroundHex: string
}

const javaColors: CodeColor[] = [
  {
    code: '0',
    name: 'black',
    display: 'Black',
    foregroundHex: '#000000',
    backgroundHex: '#000000',
  },
  {
    code: '1',
    name: 'dark_blue',
    display: 'Dark Blue',
    foregroundHex: '#0000AA',
    backgroundHex: '#00002A',
  },
  {
    code: '2',
    name: 'dark_green',
    display: 'Dark Green',
    foregroundHex: '#00AA00',
    backgroundHex: '#002A00',
  },
  {
    code: '3',
    name: 'dark_aqua',
    display: 'Dark Aqua',
    foregroundHex: '#00AAAA',
    backgroundHex: '#002A2A',
  },
  {
    code: '4',
    name: 'dark_red',
    display: 'Dark Red',
    foregroundHex: '#AA0000',
    backgroundHex: '#2A0000',
  },
  {
    code: '5',
    name: 'dark_purple',
    display: 'Dark Purple',
    foregroundHex: '#AA00AA',
    backgroundHex: '#2A002A',
  },
  {
    code: '6',
    name: 'gold',
    display: 'Gold',
    foregroundHex: '#FFAA00',
    backgroundHex: '#2A2A00',
  },
  {
    code: '7',
    name: 'gray',
    display: 'Gray',
    foregroundHex: '#AAAAAA',
    backgroundHex: '#2A2A2A',
  },
  {
    code: '8',
    name: 'dark_gray',
    display: 'Dark Gray',
    foregroundHex: '#555555',
    backgroundHex: '#151515',
  },
  {
    code: '9',
    name: 'blue',
    display: 'Blue',
    foregroundHex: '#5555FF',
    backgroundHex: '#15153F',
  },
  {
    code: 'a',
    name: 'green',
    display: 'Green',
    foregroundHex: '#55FF55',
    backgroundHex: '#153F15',
  },
  {
    code: 'b',
    name: 'aqua',
    display: 'Aqua',
    foregroundHex: '#55FFFF',
    backgroundHex: '#153F3F',
  },
  {
    code: 'c',
    name: 'red',
    display: 'Red',
    foregroundHex: '#FF5555',
    backgroundHex: '#3F1515',
  },
  {
    code: 'd',
    name: 'light_purple',
    display: 'Light Purple',
    foregroundHex: '#FF55FF',
    backgroundHex: '#3F153F',
  },
  {
    code: 'e',
    name: 'yellow',
    display: 'Yellow',
    foregroundHex: '#FFFF55',
    backgroundHex: '#3F3F15',
  },
  {
    code: 'f',
    name: 'white',
    display: 'White',
    foregroundHex: '#FFFFFF',
    backgroundHex: '#3F3F3F',
  },
]

const bedrockColors: CodeColor[] = [
  ...javaColors,
  {
    ...javaColors.find((c) => c.name === 'gold')!,
    backgroundHex: '#402A00',
  },
  {
    code: 'g',
    name: 'minecoin_gold',
    display: 'Minecoin Gold',
    foregroundHex: '#DDD605',
    backgroundHex: '#373501',
  },
  {
    code: 'h',
    name: 'material_quartz',
    display: 'Material Quartz',
    foregroundHex: '#E3D4D1',
    backgroundHex: '#383534',
  },
  {
    code: 'i',
    name: 'material_iron',
    display: 'Material Iron',
    foregroundHex: '#CECACA',
    backgroundHex: '#333232',
  },
  {
    code: 'j',
    name: 'material_netherite',
    display: 'Material Netherite',
    foregroundHex: '#443A3B',
    backgroundHex: '#110E0E',
  },
  {
    code: 'm',
    name: 'material_redstone',
    display: 'Material Redstone',
    foregroundHex: '#971607',
    backgroundHex: '#250501',
  },
  {
    code: 'n',
    name: 'material_copper',
    display: 'Material Copper',
    foregroundHex: '#B4684D',
    backgroundHex: '#2D1A13',
  },
  {
    code: 'p',
    name: 'material_gold',
    display: 'Material Gold',
    foregroundHex: '#DEB12D',
    backgroundHex: '#372C0B',
  },
  {
    code: 'q',
    name: 'material_emerald',
    display: 'Material Emerald',
    foregroundHex: '#47A036',
    backgroundHex: '#04280D',
  },
  {
    code: 's',
    name: 'material_diamond',
    display: 'Material Diamond',
    foregroundHex: '#2CBAA8',
    backgroundHex: '#0B2E2A',
  },
  {
    code: 't',
    name: 'material_lapis',
    display: 'Material Lapis',
    foregroundHex: '#21497B',
    backgroundHex: '#08121E',
  },
  {
    code: 'u',
    name: 'material_amethyst',
    display: 'Material Amethyst',
    foregroundHex: '#9A5CC6',
    backgroundHex: '#261731',
  },
]

const edition = ref<'java' | 'bedrock'>('java')
const activeColors = computed(() => (edition.value === 'java' ? javaColors : bedrockColors))
function hexColorToCode(hex: string) {
  const color = activeColors.value.find((c) => c.foregroundHex === hex)
  return color ? color.code : 'none'
}

const colorButtons = computed(() => [
  ...activeColors.value.map((color) => ({
    label: color.display,
    value: color.code,
  })),
  {
    label: 'None',
    value: 'none',
  },
])

const formatButtons = computed(() =>
  edition.value === 'java'
    ? [
        {
          label: 'Bold',
          value: 'l',
        },
        {
          label: 'Italic',
          value: 'o',
        },
        {
          label: 'Underline',
          value: 'n',
        },
        {
          label: 'Strikethrough',
          value: 'm',
        },
        {
          label: 'Obfuscated',
          value: 'k',
        },
      ]
    : [
        {
          label: 'Bold',
          value: 'l',
        },
        {
          label: 'Italic',
          value: 'o',
        },
        {
          label: 'Obfuscated',
          value: 'k',
        },
      ],
)

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
  <Field>
    <template #heading>Formatting Code Text Editor</template>
    <cdx-tabs v-model:active="edition" style="margin-bottom: 0.5rem">
      <cdx-tab name="java" label="Java Edition" />
      <cdx-tab name="bedrock" label="Bedrock Edition" />
    </cdx-tabs>
    <CdxToggleButtonGroup
      :model-value="hexColorToCode(editor?.getAttributes('textStyle').color)"
      :buttons="colorButtons"
      @update:modelValue="updateColor"
      style="margin-bottom: 0.5rem"
    />
    <CdxToggleButtonGroup
      :model-value="activeFormatCodes"
      :buttons="formatButtons"
      @update:modelValue="updateFormat"
      style="margin-bottom: 0.5rem"
    />
    <EditorContent class="fc-editor" style="margin-bottom: 0.5rem" :editor="editor" />
    <label for="fc-output">Output</label>
    <textarea ref="textarea" name="fc-output" :value="formatCode" disabled />
  </Field>
</template>
<style>
.fc-editor {
  font-family: 'Minecraft', monospace, sans-serif;
  border: 1px solid #a2a9b1;
  border-radius: 4px;
}

.fc-editor p {
  margin: 0;
}
</style>
