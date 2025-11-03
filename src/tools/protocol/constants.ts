export const DATA_REPO =
  'https://raw.githubusercontent.com/Nickid2018/MC_Protocol_Data/refs/heads/master'
export const VERSIONS_JSON = `${DATA_REPO}/java_edition/versions.json`
export const INDEX_CSV = `${DATA_REPO}/java_edition/indexes.csv`
export const PACKETS_CSV = `${DATA_REPO}/java_edition/packets.csv`
export const INITIAL_PROTOCOL = `${DATA_REPO}/java_edition/initial.json`

export function indexed(index: number, path: string) {
  return index > -1
    ? `${DATA_REPO}/java_edition/indexed_data/${index}/${path}`
    : `${DATA_REPO}/java_edition/${path}`
}
