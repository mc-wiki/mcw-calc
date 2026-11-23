import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { colorMap } from '../src/utils/color/java'

const scratch = mkdtempSync(join(tmpdir(), 'mcw-armor-colors-'))
const generator = join(scratch, process.platform === 'win32' ? 'generate.exe' : 'generate')
const source = fileURLToPath(new URL('./armorColor/generate.cpp', import.meta.url))
const output = fileURLToPath(new URL('../src/tools/armorColor/data/', import.meta.url))
try {
  execFileSync(process.env.CXX || 'c++', ['-O3', '-std=c++17', source, '-o', generator], {
    stdio: 'inherit',
  })
  const palette = Object.values(colorMap).map((rgb) => rgb.toString(16))
  execFileSync(generator, [scratch, ...palette], { stdio: 'inherit' })
  mkdirSync(output, { recursive: true })
  const tables = ['gamut', ...Array.from({ length: 16 }, (_, i) => `recipes-${i}`)]
  for (const name of tables) {
    const raw = readFileSync(join(scratch, `${name}.raw`))
    writeFileSync(join(output, `${name}.bin`), gzipSync(raw, { level: 9 }))
  }
} finally {
  rmSync(scratch, { recursive: true, force: true })
}
