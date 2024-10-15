import { describe, expect, it } from 'vitest'
import {
  colorStringToRgb,
  colorToSequence,
  deltaE,
  floatRgbToInteger,
  rgb2lab,
  separateRgb,
  sequenceToColorFloatAverage,
  sequenceToColorFloatAverageRounded,
} from './'
import { colorRgbMap } from './java'

describe('colorStringToRgb', () => {
  it('should convert color string to RGB', () => {
    const color = '#FF0000'
    expect(colorStringToRgb(color)).toEqual([255, 0, 0])
  })
})

describe('floatRgbToInteger', () => {
  it('should convert float RGB to integer', () => {
    const rgb = [0.5, 0.5, 0.5] as [number, number, number]
    expect(floatRgbToInteger(rgb)).toEqual([127, 127, 127])
  })
})

describe('separateRgb', () => {
  it('should separate RGB', () => {
    const rgb = 16711680
    expect(separateRgb(rgb)).toEqual([255, 0, 0])
  })
})

describe('rgb2lab', () => {
  it('should convert RGB to Lab', () => {
    const rgb = [255, 0, 0]
    expect(rgb2lab(rgb)).toEqual([53.23288178584245, 80.10930952982204, 67.22006831026425])
  })
})

describe('deltaE', () => {
  it('should calculate deltaE', () => {
    const labA = [53.24079414140596, 80.0924595964396, 67.20319679937795]
    const labB = [100, 0, 0]
    expect(deltaE(labA, labB)).toBeCloseTo(50.2225)
  })
})

describe('sequenceToColorFloatAverage', () => {
  it('should calculate the float average color of a sequence', () => {
    const colorRgbMap = {
      white: [255, 255, 255],
      black: [0, 0, 0],
      red: [255, 0, 0],
      green: [0, 255, 0],
      blue: [0, 0, 255],
    }
    // const sequence = ['red', 'green', 'blue']
    const sequence = ['black', 'white']
    const expected = [127, 127, 127]
    // @ts-expect-error test
    expect(sequenceToColorFloatAverage(sequence, colorRgbMap)).toEqual(expected)
  })
})

describe('sequenceToColorFloatAverageRounded', () => {
  it('should calculate the rounded float average color of a sequence', () => {
    const colorRgbMap = {
      white: [255, 255, 255],
      black: [0, 0, 0],
      red: [255, 0, 0],
      green: [0, 255, 0],
      blue: [0, 0, 255],
    }
    const sequence = ['red', 'green', 'blue']
    const expected = [255, 255, 255]
    // @ts-expect-error test
    expect(sequenceToColorFloatAverageRounded(sequence, colorRgbMap)).toEqual(expected)
  })
})

describe('colorToSequence', () => {
  it('should convert color to sequence', () => {
    expect(colorToSequence(colorRgbMap, sequenceToColorFloatAverage, colorRgbMap.red)).toEqual([
      ['red'],
      0,
      colorRgbMap.red,
    ])
  })
})
