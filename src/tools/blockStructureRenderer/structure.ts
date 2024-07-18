import type { BlockStructure, NameMapping } from '@/tools/blockStructureRenderer/renderer.ts'
import * as nbt from '@/utils/nbt.ts'

function makePalette(structure: BlockStructure, nameMapping: NameMapping, ignoreAir: boolean) {
  const collectedBlockKeys = new Set<string>()
  structure.forEachBlock(
    (x, y, z, key) => {
      if (ignoreAir && key === '+') return
      collectedBlockKeys.add(key)
    },
    false,
    true,
  )

  const palette = Array.from(collectedBlockKeys)
  const paletteMapping = new Map<string, number>()
  palette.forEach((key, index) => paletteMapping.set(key, index))
  const paletteNbt = nbt.list(
    palette.map((key) => {
      const blockState = nameMapping.toBlockState(key)
      if (Object.entries(blockState.blockProperties).length > 0) {
        const propertiesMap = {} as Record<string, nbt.Tag>
        Object.entries(blockState.blockProperties).forEach(([key, value]) => {
          propertiesMap[key] = nbt.string(value)
        })
        return nbt.compound({
          Name: nbt.string('minecraft:' + blockState.blockName),
          Properties: nbt.compound(propertiesMap),
        })
      } else {
        return nbt.compound({ Name: nbt.string(blockState.blockName) })
      }
    }),
    'compound',
  )

  return { paletteMapping, paletteNbt }
}

export function saveAsStructureFile(structure: BlockStructure, nameMapping: NameMapping) {
  const { paletteMapping, paletteNbt } = makePalette(structure, nameMapping, true)
  const blocks = [] as Record<string, any>[]
  structure.forEachBlock(
    (x, y, z, key) => {
      if (key === '+') return
      blocks.push({
        pos: nbt.list([nbt.int(x), nbt.int(y), nbt.int(z)]),
        state: nbt.int(paletteMapping.get(key)!),
      })
    },
    false,
    true,
  )
  const blocksNbt = nbt.list(
    blocks.map((block) => nbt.compound(block)),
    'compound',
  )
  const structureNbt = nbt.compound({
    size: nbt.list([nbt.int(structure.x), nbt.int(structure.y), nbt.int(structure.z)]),
    palette: paletteNbt,
    blocks: blocksNbt,
    entities: nbt.list([], 'compound'),
    DataVersion: nbt.int(3837),
  })

  return gzip(nbt.writeUncompressedTag(structureNbt))
}

export function saveAsLitematic(structure: BlockStructure, nameMapping: NameMapping) {
  const { paletteMapping, paletteNbt } = makePalette(structure, nameMapping, false)

  const packBits = Math.max(2, Math.ceil(Math.log2(paletteMapping.size)))
  const packingArrayLength = Math.ceil((packBits * structure.x * structure.y * structure.z) / 64)
  const packingArray = new BigUint64Array(packingArrayLength)
  let offsetNow = 0
  let blocksCount = 0

  structure.forEachBlock(
    (x, y, z, key) => {
      if (key !== '+' && key !== '-') blocksCount++

      const paletteIndex = BigInt(paletteMapping.get(key)!)
      const bitOffset = offsetNow * packBits
      const arrayOffset = bitOffset >> 6
      const bitShift = BigInt(bitOffset & 63)
      const bitsLeft = 64n - bitShift

      if (bitsLeft >= packBits) {
        packingArray[arrayOffset] |= paletteIndex << bitShift
      } else {
        packingArray[arrayOffset] |= (paletteIndex << bitShift) & ((1n << 64n) - 1n)
        packingArray[arrayOffset + 1] |= paletteIndex >> bitsLeft
      }
      offsetNow++
    },
    false,
    true,
  )

  const packingNbt = nbt.longArray(Array.from(packingArray))
  const timeNow = Date.now()
  const litematicNbt = nbt.compound({
    Version: nbt.int(6),
    SubVersion: nbt.int(1),
    MinecraftDataVersion: nbt.int(3837),
    Metadata: nbt.compound({
      Name: nbt.string('Block Structure'),
      Author: nbt.string('Minecraft Wiki'),
      Description: nbt.string(''),
      RegionCount: nbt.int(1),
      TotalVolume: nbt.int(structure.x * structure.y * structure.z),
      TotalBlocks: nbt.int(blocksCount),
      TimeCreated: nbt.long(BigInt(timeNow)),
      TimeModified: nbt.long(BigInt(timeNow)),
      EnclosingSize: nbt.compound({
        x: nbt.int(structure.x),
        y: nbt.int(structure.y),
        z: nbt.int(structure.z),
      }),
    }),
    Regions: nbt.compound({
      Structure: nbt.compound({
        Position: nbt.compound({
          x: nbt.int(0),
          y: nbt.int(0),
          z: nbt.int(0),
        }),
        Size: nbt.compound({
          x: nbt.int(structure.x),
          y: nbt.int(structure.y),
          z: nbt.int(structure.z),
        }),
        BlockStatePalette: paletteNbt,
        BlockStates: packingNbt,
        TileEntities: nbt.list([], 'compound'),
      }),
    }),
  })

  return gzip(nbt.writeUncompressedTag(litematicNbt))
}

async function gzip(data: Uint8Array) {
  if (!CompressionStream) {
    const { Gzip } = await import('zlibt2')
    return new Gzip(data).compress() as Uint8Array
  }
  const stream = new Response(data).body!.pipeThrough<Uint8Array>(new CompressionStream('gzip'))
  return (await new Response(stream).arrayBuffer()) as Uint8Array
}
