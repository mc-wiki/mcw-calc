import { colorRgbMap as javaColorRgbMap } from '@/utils/color/java'
import { colorRgbMap as bedrockColorRgbMap } from '@/utils/color/bedrock'
import { colorToSequence as func, sequenceToColorFloatAverage } from '@/utils/color'

export async function colorToSequence(
  edition: 'java' | 'bedrock',
  targetColor: [number, number, number],
) {
  return func(
    edition === 'java' ? javaColorRgbMap : bedrockColorRgbMap,
    sequenceToColorFloatAverage,
    targetColor,
  )
}
