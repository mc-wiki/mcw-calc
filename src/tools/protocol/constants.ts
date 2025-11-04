export const DATA_REPO =
  'https://raw.githubusercontent.com/Nickid2018/MC_Protocol_Data/refs/heads/master'
export const VERSIONS_JSON = `${DATA_REPO}/java_edition/versions.json`
export const INDEX_CSV = `${DATA_REPO}/java_edition/indexes.csv`
export const PACKETS_CSV = `${DATA_REPO}/java_edition/packets.csv`
export const INITIAL_PROTOCOL = `${DATA_REPO}/java_edition/initial.json`

// prettier-ignore
export const PRIMITIVE_TYPES = new Set([
  // Integers
  'i8', 'i16', 'i32', 'i64',
  // Integers (Unsigned)
  'u8', 'u16', 'u32', 'u64',
  // Integers (Unsigned & Represented in hex)
  'u8_hex', 'u16_hex', 'u32_hex', 'u64_hex',
  // Floats
  'f32', 'f64',
  // Variable Length Integers
  'varint', 'varlong',
  // Other primitives
  'bool', 'string', 'buffer', 'rest_buffer', 'uuid', 'nbt',
])

export function indexed(index: number, path: string) {
  return index > -1
    ? `${DATA_REPO}/java_edition/indexed_data/${index}/${path}`
    : `${DATA_REPO}/java_edition/${path}`
}

export function isVoidProtocol(data: string | object) {
  if (data === 'void') return true
  return Array.isArray(data) && data[0] === 'void'
}

export function getAsPrimitiveProtocol(data: string | object) {
  if (typeof data === 'string' && PRIMITIVE_TYPES.has(data)) return data
  return Array.isArray(data) && PRIMITIVE_TYPES.has(data[0]) ? data[0] : undefined
}

export type GetOrCache = <T>(p: number, k: string, missing: () => Promise<T>) => Promise<T>
export type IndexerType = (protocolVersion: number, key: string) => number