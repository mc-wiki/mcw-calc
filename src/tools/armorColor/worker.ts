import type { Color } from '@/utils/color'
import { colorToSequence as func, sequenceToColorFloatAverage } from '@/utils/color'
import { colorRgbMap as bedrockColorRgbMap } from '@/utils/color/bedrock'
import { colorRgbMap as javaColorRgbMap } from '@/utils/color/java'

function sequenceToColorJavaArmor(
  c: Color[],
  colorRgbMap: typeof javaColorRgbMap,
): [number, number, number] {
  let numberOfColors = 0
  let totalRed = 0
  let totalGreen = 0
  let totalBlue = 0
  let totalMaximum = 0
  for (const color of c) {
    totalRed = totalRed + colorRgbMap[color][0]
    totalGreen = totalGreen + colorRgbMap[color][1]
    totalBlue = totalBlue + colorRgbMap[color][2]
    totalMaximum = totalMaximum + Math.max(...colorRgbMap[color])
    numberOfColors++
  }
  const averageRed = Math.floor(totalRed / numberOfColors)
  const averageGreen = Math.floor(totalGreen / numberOfColors)
  const averageBlue = Math.floor(totalBlue / numberOfColors)
  const averageMaximum = Math.floor(totalMaximum / numberOfColors)
  const maximumOfAverage = Math.max(averageRed, averageGreen, averageBlue)

  const gainFactor = averageMaximum / maximumOfAverage

  const resultRed = averageRed * gainFactor
  const resultGreen = averageGreen * gainFactor
  const resultBlue = averageBlue * gainFactor

  return [resultRed, resultGreen, resultBlue].map(Math.floor) as [number, number, number]
}

export async function colorToSequence(
  targetColor: [number, number, number],
  edition: 'java' | 'bedrock',
) {
  return func(
    edition === 'java' ? javaColorRgbMap : bedrockColorRgbMap,
    edition === 'java' ? sequenceToColorJavaArmor : sequenceToColorFloatAverage,
    targetColor,
  )
}
