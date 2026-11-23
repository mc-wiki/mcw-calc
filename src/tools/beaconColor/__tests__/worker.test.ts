import type { Color } from '@/utils/color'
import type { Edition } from '@/utils/color/dyeMix'
import assert from 'node:assert/strict'
// eslint-disable-next-line test/no-import-node-test -- The project runs these with its existing tsx dependency.
import { test } from 'node:test'
import { getDyeMixIndex } from '@/utils/color/dyeMix'
import { colorMap } from '@/utils/color/java'
import { findBeamMatches } from '../worker'

// Replay each channel independently, preserving fractions until the final color.
function replay(sequence: Color[], edition: Edition = 'java') {
  const [first, ...rest] = sequence
  if (first === undefined) return edition === 'bedrock' ? 0xffffff : colorMap.white
  const palette = { ...colorMap, white: edition === 'bedrock' ? 0xf0f0f0 : colorMap.white }
  const channels = [16, 8, 0].map((shift) => {
    const channel = (glass: Color) => (palette[glass] >> shift) & 0xff
    return Math.floor(rest.reduce((beam, glass) => (beam + channel(glass)) / 2, channel(first)))
  })
  return (channels[0] << 16) | (channels[1] << 8) | channels[2]
}

test('finds the best match at each glass count for issue #113', () => {
  const matches = findBeamMatches('java', 0xd8ab7d)
  assert.deepEqual(
    matches.map(({ rgb }) => rgb),
    [0xf9fffe, 0x9d9d97, 0xf8b173, 0xd8a673, 0xd5a97c, 0xd9ab7c, 0xd8ab7d],
  )
  matches.forEach(({ rgb, sequence, deltaE }, depth) => {
    assert.equal(sequence.length, depth)
    assert.equal(replay(sequence), rgb)
    if (depth > 0) assert.ok(deltaE < matches[depth - 1].deltaE)
  })
  assert.equal(matches.at(-1)!.deltaE, 0)
})

test('uses the bare beam color for zero glass in each edition', () => {
  for (const [edition, bare] of [
    ['java', 0xf9fffe],
    ['bedrock', 0xffffff],
  ] as const) {
    assert.deepEqual(findBeamMatches(edition, bare), [{ rgb: bare, deltaE: 0, sequence: [] }])
  }
})

test('sets the Bedrock beam to the first glass color before mixing later layers', () => {
  const white = findBeamMatches('bedrock', 0xf0f0f0)
  assert.equal(white.length, 2)
  assert.equal(white[0].rgb, 0xffffff)
  assert.deepEqual(white[0].sequence, [])
  assert.ok(white[0].deltaE > 0)
  assert.deepEqual(white[1], { rgb: 0xf0f0f0, deltaE: 0, sequence: ['white'] })

  const best = findBeamMatches('bedrock', 0xd08f8b).at(-1)!
  assert.equal(best.deltaE, 0)
  assert.equal(best.sequence.length, 2)
  assert.equal(replay(best.sequence, 'bedrock'), 0xd08f8b)
})

test('counts every distinct Bedrock beam color including the bare beam', () => {
  const { depths } = getDyeMixIndex('bedrock')
  const bare = findBeamMatches('bedrock', 0xffffff)[0].rgb
  let count = depths[bare] === 0 ? 1 : 0
  for (const depth of depths) {
    if (depth > 0) count++
  }
  assert.equal(count, 4_732_110)
})

test('skips glass counts that cannot improve an unreachable target', () => {
  const matches = findBeamMatches('java', 0)
  assert.deepEqual(
    matches.map(({ sequence }) => sequence.length),
    [0, 1, 8],
  )
  const best = matches.at(-1)!
  assert.equal(best.rgb, 0x1d1d20)
  assert.equal(replay(best.sequence), best.rgb)
  assert.ok(Math.abs(best.deltaE - 11.099758247457508) < 1e-10)
})

test('reconstructs a shortest stack even at depth 21', () => {
  const best = findBeamMatches('java', 0x6ba1cc).at(-1)!
  assert.equal(best.sequence.length, 21)
  assert.equal(best.deltaE, 0)
  assert.equal(replay(best.sequence), 0x6ba1cc)
})
