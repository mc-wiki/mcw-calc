import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
// eslint-disable-next-line test/no-import-node-test -- Use the existing tsx dependency.
import { test } from 'node:test'
import { gunzipSync } from 'node:zlib'
import { separateRgb } from '@/utils/color'
import { craftArmorColor } from '@/utils/color/java'
import { createJavaRecipeFinder } from '../multiCraft'

async function loadTable(name: string) {
  return gunzipSync(await readFile(new URL(`../data/${name}.bin`, import.meta.url)))
}
const solve = createJavaRecipeFinder(loadTable)

test('replays each crafting step with its previous armor color at minimum total dye cost', async () => {
  for (const [color, minimum] of [
    [0xd8ab7d, 5],
    [0xaf343a, 6],
    [0x91cd22, 9],
    [0xbc951b, 40],
  ]) {
    const target = separateRgb(color)
    const result = await solve(target)
    assert.equal(result.distance, 0)
    assert.deepEqual(result.rgb, target)
    assert.equal(result.rounds.flat().length, minimum)
    let previous: [number, number, number] | undefined
    for (const dyes of result.rounds) {
      assert.ok(dyes.length >= 1 && dyes.length <= 8)
      previous = craftArmorColor(previous, dyes)
    }
    assert.deepEqual(previous, target)
  }
  assert.equal((await solve(separateRgb(0x91cd22))).rounds.length, 2)
})

test('searches the complete gamut for the nearest CIE94 match', async () => {
  const white = await solve(separateRgb(0xfafffe))
  assert.deepEqual(white.rounds, [['white']])
  assert.deepEqual(white.rgb, separateRgb(0xf9fffe))
  assert.ok(Math.abs(white.distance - 0.3290137859) < 1e-8)
  const green = await solve([0, 255, 0])
  assert.deepEqual(green.rgb, separateRgb(0xa9e380))
  assert.equal(green.rounds.flat().length, 17)
})

test('retries the failed asset and keeps successful requests in the worker cache', async () => {
  const loads: string[] = []
  const find = createJavaRecipeFinder(async (name) => {
    const attempted = loads.includes(name)
    loads.push(name)
    if (!attempted) throw new Error(name)
    return loadTable(name)
  })
  const rgb = separateRgb(0xbc951b)
  await assert.rejects(find(rgb), /gamut/)
  await assert.rejects(find(rgb), /recipes-11/)
  assert.deepEqual((await find(rgb)).rgb, rgb)
  assert.deepEqual((await find(rgb)).rgb, rgb)
  assert.deepEqual(loads, ['gamut', 'gamut', 'recipes-11', 'recipes-11'])
})
