function encodeModifiedUTF8(str: string) {
  const array = []
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    if (c < 0x80 && c !== 0) {
      array.push(c)
    } else if (c >= 0x800) {
      array.push(0xe0 | ((c >> 12) & 0x0f))
      array.push(0x80 | ((c >> 6) & 0x3f))
      array.push(0x80 | (c & 0x3f))
    } else {
      array.push(0xc0 | ((c >> 6) & 0x1f))
      array.push(0x80 | (c & 0x3f))
    }
  }
  return array
}

const TAG_NAME_TO_ID = {
  end: 0,
  byte: 1,
  short: 2,
  int: 3,
  long: 4,
  float: 5,
  double: 6,
  byte_array: 7,
  string: 8,
  list: 9,
  compound: 10,
  int_array: 11,
  long_array: 12,
} as Record<string, number>

export interface Tag {
  type: string
  value: any
}

function writeTag(tag: Tag, storage: NBTDataStorage, offset: number) {
  switch (tag.type) {
    case 'byte':
      storage.ensureCapacity(offset, 1)
      storage.view.setInt8(offset, tag.value)
      return 1
    case 'short':
      storage.ensureCapacity(offset, 2)
      storage.view.setInt16(offset, tag.value)
      return 2
    case 'int':
      storage.ensureCapacity(offset, 4)
      storage.view.setInt32(offset, tag.value)
      return 4
    case 'long':
      storage.ensureCapacity(offset, 8)
      storage.view.setBigInt64(offset, tag.value)
      return 8
    case 'float':
      storage.ensureCapacity(offset, 4)
      storage.view.setFloat32(offset, tag.value)
      return 4
    case 'double':
      storage.ensureCapacity(offset, 8)
      storage.view.setFloat64(offset, tag.value)
      return 8
    case 'byte_array':
      storage.ensureCapacity(offset, 4)
      storage.view.setInt32(offset, tag.value.length)
      storage.ensureCapacity(offset + 4, tag.value.length)
      tag.value.forEach((value: number, index: number) =>
        storage.view.setInt8(offset + 4 + index, value),
      )
      return 4 + tag.value.length
    case 'int_array':
      storage.ensureCapacity(offset, 4)
      storage.view.setInt32(offset, tag.value.length)
      storage.ensureCapacity(offset + 4, 4 * tag.value.length)
      tag.value.forEach((value: number, index: number) =>
        storage.view.setInt32(offset + 4 + index * 4, value),
      )
      return 4 + tag.value.length * 4
    case 'long_array':
      storage.ensureCapacity(offset, 4)
      storage.view.setInt32(offset, tag.value.length)
      storage.ensureCapacity(offset + 4, 8 * tag.value.length)
      tag.value.forEach((value: bigint, index: number) =>
        storage.view.setBigInt64(offset + 4 + index * 8, value),
      )
      return 4 + tag.value.length * 8
  }

  if (tag.type === 'string') {
    const byteArr = encodeModifiedUTF8(tag.value)
    storage.ensureCapacity(offset, 2)
    storage.view.setInt16(offset, byteArr.length)
    storage.ensureCapacity(offset + 2, byteArr.length)
    byteArr.forEach((value: number, index: number) =>
      storage.view.setInt8(offset + 2 + index, value),
    )
    return 2 + byteArr.length
  }

  if (tag.type === 'list') {
    const list = tag.value[0] as Tag[]
    const type = tag.value[1] as string
    if (list.some((tag) => tag.type !== type)) throw new Error('List tag type mismatch!')
    storage.ensureCapacity(offset, 5)
    storage.view.setInt8(offset, TAG_NAME_TO_ID[type])
    storage.view.setInt32(offset + 1, list.length)
    let count = 5
    list.forEach((tag) => (count += writeTag(tag, storage, offset + count)))
    return count
  }

  if (tag.type === 'compound') {
    const compound = tag.value as { [key: string]: Tag }
    let count = 0
    for (const key in compound) {
      storage.ensureCapacity(offset + count, 1)
      storage.view.setInt8(offset + count, TAG_NAME_TO_ID[compound[key].type])
      const byteArr = encodeModifiedUTF8(key)
      storage.ensureCapacity(offset + count + 1, 2)
      storage.view.setInt16(offset + count + 1, byteArr.length)
      storage.ensureCapacity(offset + count + 3, byteArr.length)
      byteArr.forEach((value: number, index: number) =>
        storage.view.setInt8(offset + count + 3 + index, value),
      )
      count += 3 + byteArr.length
      count += writeTag(compound[key], storage, offset + count)
    }
    storage.ensureCapacity(offset + count, 1)
    storage.view.setInt8(offset + count, TAG_NAME_TO_ID.end)
    return count + 1
  }

  throw new Error('Invalid tag type!')
}

export function compound(value: { [key: string]: Tag }): Tag {
  return { type: 'compound', value }
}

export function list(value: Tag[], tagType?: string): Tag {
  return { type: 'list', value: [value, tagType ?? value[0].type] }
}

export function string(value: string): Tag {
  return { type: 'string', value }
}

export function byteArray(value: number[]): Tag {
  return { type: 'byte_array', value }
}

export function intArray(value: number[]): Tag {
  return { type: 'int_array', value }
}

export function longArray(value: bigint[]): Tag {
  return { type: 'long_array', value }
}

export function byte(value: number): Tag {
  return { type: 'byte', value }
}

export function short(value: number): Tag {
  return { type: 'short', value }
}

export function int(value: number): Tag {
  return { type: 'int', value }
}

export function long(value: bigint): Tag {
  return { type: 'long', value }
}

export function float(value: number): Tag {
  return { type: 'float', value }
}

export function double(value: number): Tag {
  return { type: 'double', value }
}

class NBTDataStorage {
  buffer: ArrayBuffer
  view: DataView

  constructor() {
    this.buffer = new ArrayBuffer(1024)
    this.view = new DataView(this.buffer)
  }

  ensureCapacity(offset: number, size: number) {
    if (offset + size > this.buffer.byteLength) {
      const newBuffer = new ArrayBuffer(this.buffer.byteLength * 2)
      new Uint8Array(newBuffer).set(new Uint8Array(this.buffer))
      this.buffer = newBuffer
      this.view = new DataView(this.buffer)
    }
  }
}

export function writeUncompressedTag(tag: Tag) {
  if (tag.type !== 'compound') throw new Error('Root tag must be a compound tag!')

  const storage = new NBTDataStorage()
  storage.view.setInt8(0, TAG_NAME_TO_ID.compound)
  storage.view.setInt16(1, 0)
  const len = writeTag(tag, storage, 3)
  return new Uint8Array(storage.buffer, 0, len + 3)
}
