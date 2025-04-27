import { z } from 'zod'

export const TextContent = z.union([
  z.interface({ 'type?': z.literal('text'), text: z.string() }),
  z.interface({
    'type?': z.literal('translatable'),
    translate: z.string(),
    'fallback?': z.string(),
    get 'with?'() {
      return z.union([TextComponentFormat, z.number(), z.boolean()]).array()
    },
  }),
  z.interface({
    'type?': z.literal('keybind'),
    keybind: z.string(),
  }),
  z.interface({
    'type?': z.literal('score'),
    score: z.interface({
      name: z.string(),
      objective: z.string(),
    }),
  }),
  z.interface({
    'type?': z.literal('selector'),
    selector: z.string(),
    get 'separator?'() {
      return TextComponentFormat
    },
  }),
  z.intersection(
    z.interface({
      'type?': z.literal('nbt'),
      nbt: z.string(),
      'interpret?': z.boolean(),
      get 'separator?'() {
        return TextComponentFormat
      },
    }),
    z.union([
      z.interface({
        'source?': z.literal('entity'),
        entity: z.string(),
      }),
      z.interface({
        'source?': z.literal('block'),
        block: z.string(),
      }),
      z.interface({
        'source?': z.literal('storage'),
        storage: z.string(),
      }),
    ]),
  ),
])

export type TextContent = z.infer<typeof TextContent>

export const TextChildren = z.interface({
  get 'extra?'() {
    return TextComponentFormat.array()
  },
})

export type TextChildren = z.infer<typeof TextChildren>

export const TextStyle = z.interface({
  'color?': z.union([
    z.enum([
      'white',
      'light_gray',
      'gray',
      'black',
      'brown',
      'red',
      'orange',
      'yellow',
      'lime',
      'green',
      'cyan',
      'light_blue',
      'blue',
      'purple',
      'magenta',
      'pink',
    ]),
    z.string().refine((val) => /^#[0-9a-fA-F]{6}$/.test(val)),
  ]),
  'shadow_color?': z.number().or(z.number().min(0).max(1).array().length(4)),
  'font?': z.string(),
  'bold?': z.boolean(),
  'italic?': z.boolean(),
  'underlined?': z.boolean(),
  'strikethrough?': z.boolean(),
  'obfuscated?': z.boolean(),
  'click_event?': z.discriminatedUnion('action', [
    z.interface({ action: z.literal('change_page'), page: z.number().int().min(0) }),
    z.interface({ action: z.literal('copy_to_clipboard'), value: z.string() }),
    z.interface({ action: z.literal('open_file'), path: z.string() }),
    z.interface({
      action: z.literal('open_url'),
      url: z
        .url()
        .refine((val) => new URL(val).protocol === 'http' || new URL(val).protocol === 'https'),
    }),
    z.interface({ action: z.literal('run_command'), command: z.string() }),
    z.interface({ action: z.literal('suggest_command'), command: z.string() }),
  ]),
  'insertion?': z.string(),
  get 'hover_event?'() {
    return z.discriminatedUnion('action', [
      z.interface({
        action: z.literal('show_entity'),
        id: z.string(),
        'name?': TextComponentFormat,
        'uuid?': z.uuid().or(z.number().int().array().length(4)),
      }),
      z.interface({
        action: z.literal('show_item'),
        id: z.string(),
        components: z.record(z.string(), z.any()),
        count: z.number().int().min(0),
      }),
      z.interface({
        action: z.literal('show_text'),
        text: TextComponentFormat,
      }),
    ])
  },
})

export type TextStyle = z.infer<typeof TextStyle>

export const TextComponentCompoundFormat: z.ZodType<TextContent & TextChildren & TextStyle> =
  TextContent.and(TextChildren).and(TextStyle)

function convertToCompound(arg: unknown) {
  if (typeof arg === 'string') {
    return { text: arg }
  }

  if (Array.isArray(arg)) {
    const compounds = arg.map((item) => (typeof item === 'string' ? { text: item } : item))
    const result = compounds[0]
    result.extra = [...(result.extra ?? []), ...compounds.slice(1)]

    return result
  }

  return arg
}

export const TextComponentFormat: z.ZodType<z.infer<typeof TextComponentCompoundFormat>> =
  z.preprocess(convertToCompound, TextComponentCompoundFormat)

export function parsePartitionedTextComponent(component: unknown) {
  const compound = convertToCompound(component)
  const content = TextContent.safeParse(compound)
  const children = TextChildren.safeParse(compound)
  const style = TextStyle.safeParse(compound)
  if (!content.success || !children.success || !style.success) {
    //combine errors
    const errors = [
      ...(content.success ? [] : content.error.issues),
      ...(children.success ? [] : children.error.issues),
      ...(style.success ? [] : style.error.issues),
    ]
    return {
      success: false,
      error: {
        issues: errors,
        message: 'Invalid text component',
      },
    }
  }
  return {
    success: true,
    data: {
      content: content.data,
      children: children.data,
      style: style.data,
    },
  }
}

export type TextComponentFormat = z.infer<typeof TextComponentFormat>
