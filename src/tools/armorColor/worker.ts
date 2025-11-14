import type { Color } from '@/utils/color'
import { entries, colorToRecipeJava, sequenceToColorFloatAverage } from '@/utils/color'
import { colorRgbMap as bedrockColorRgbMap } from '@/utils/color/bedrock'
import { colorRgbMap as javaColorRgbMap } from '@/utils/color/java'

export async function colorToSequence(
  targetColor: [number, number, number],
  edition: 'java' | 'bedrock',
) {
  // only support je for now;
  return colorToRecipeJava(
    entries,
    targetColor,
  )
}
