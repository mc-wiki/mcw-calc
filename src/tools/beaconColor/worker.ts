import { colorToSequence as func, sequenceToColorFloatAverage } from '@/utils/color'
import { colorRgbMap as bedrockColorRgbMap } from '@/utils/color/bedrock'
import { colorRgbMap as javaColorRgbMap } from '@/utils/color/java'

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
