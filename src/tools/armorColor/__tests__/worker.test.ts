import type { Color } from '@/utils/color'
import assert from 'node:assert/strict'
// eslint-disable-next-line test/no-import-node-test -- Use the existing tsx dependency.
import { test } from 'node:test'
import { separateRgb } from '@/utils/color'
import { colorRgbMap } from '@/utils/color/java'
import { colorToSequence } from '../worker'

function craft(dyes: Color[]) {
  const colors = dyes.map((dye) => colorRgbMap[dye])
  const mean = [0, 1, 2].map((c) =>
    Math.floor(colors.reduce((sum, rgb) => sum + rgb[c], 0) / colors.length),
  )
  const brightness = Math.fround(
    colors.reduce((sum, rgb) => sum + Math.max(...rgb), 0) / colors.length,
  )
  return mean.map((v) => Math.trunc(Math.fround(Math.fround(v * brightness) / Math.max(...mean))))
}

test('constructs exact Java recipes with the fewest dyes in a single craft', () => {
  for (const [target, count] of [
    [0xad5398, 2],
    [0xaf353d, 7],
    [0xaf343a, 8],
  ]) {
    const rgb = separateRgb(target)
    const [dyes, distance, actual] = colorToSequence(rgb, 'java')
    assert.equal(distance, 0)
    assert.equal(dyes.length, count)
    assert.deepEqual(craft(dyes), rgb)
    assert.deepEqual(actual, rgb)
  }
})

test('inverts Java single-precision rounding at a channel boundary', () => {
  const target = separateRgb(0x7b8966)
  const [dyes, distance] = colorToSequence(target, 'java')
  assert.equal(dyes.length, 6)
  assert.equal(distance, 0)
  assert.deepEqual(craft(dyes), target)
})

test('returns the closest single-craft color to an unreachable target', () => {
  const [dyes, distance, actual] = colorToSequence(separateRgb(0xd8ab7d), 'java')
  assert.deepEqual(actual, separateRgb(0xd8ab7c))
  assert.deepEqual(craft(dyes), actual)
  assert.equal(dyes.length, 8)
  assert.ok(Math.abs(distance - 0.2595) < 0.0001)
})

test('counts the first cauldron dye and respects the order of subsequent dyes', () => {
  const white = separateRgb(0xf0f0f0)
  assert.deepEqual(colorToSequence(white, 'bedrock'), [['white'], 0, white])
  const target = separateRgb(0x593e89)
  const [dyes, distance, actual] = colorToSequence(target, 'bedrock')
  assert.equal(dyes.length, 3)
  assert.equal(distance, 0)
  assert.deepEqual(actual, target)
  const replay = dyes
    .map((name) => (name === 'white' ? white : colorRgbMap[name]))
    .reduce((a, b) => [0, 1, 2].map((c) => (a[c] + b[c]) >>> 1) as [number, number, number])
  assert.deepEqual(replay, target)
})

test('finds the nearest cauldron color across RGB block boundaries', () => {
  const [dyes, distance, actual] = colorToSequence([255, 0, 255], 'bedrock')
  assert.deepEqual(actual, separateRgb(0xcc61c3))
  assert.equal(dyes.length, 9)
  assert.ok(distance > 0)
})
