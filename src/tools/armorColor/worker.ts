import { colorRgbMap as javaColorRgbMap } from '@/utils/color/java'
import { colorRgbMap as bedrockColorRgbMap } from '@/utils/color/bedrock'
import { colorToSequence as func, sequenceToColorFloatAverage, type Color } from '@/utils/color'

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
  const averageRed = totalRed / numberOfColors
  const averageGreen = totalGreen / numberOfColors
  const averageBlue = totalBlue / numberOfColors
  const averageMaximum = totalMaximum / numberOfColors
  const maximumOfAverage = Math.max(averageRed, averageGreen, averageBlue)

  const gainFactor = averageMaximum / maximumOfAverage

  const resultRed = averageRed * gainFactor
  const resultGreen = averageGreen * gainFactor
  const resultBlue = averageBlue * gainFactor

  return [resultRed, resultGreen, resultBlue]
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
