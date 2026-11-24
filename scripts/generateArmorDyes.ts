import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import zlibt2 from 'zlibt2'
import javaDyes from '../src/utils/color/javaDyes.json' with { type: 'json' }

const scratch = mkdtempSync(join(tmpdir(), 'mcw-armor-colors-'))
const generator = join(scratch, process.platform === 'win32' ? 'generate.exe' : 'generate')
const source = fileURLToPath(new URL('./armorColor/generate.cpp', import.meta.url))
const output = fileURLToPath(new URL('../src/tools/armorColor/data/', import.meta.url))
try {
  execFileSync(process.env.CXX || 'c++', ['-O3', '-std=c++17', source, '-o', generator], {
    stdio: 'inherit',
  })
  execFileSync(generator, [scratch, ...Object.values(javaDyes)], { stdio: 'inherit' })
  mkdirSync(output, { recursive: true })
  const tables = ['gamut', ...Array.from({ length: 16 }, (_, i) => `recipes-${i}`)]
  for (const name of tables) {
    const raw = readFileSync(join(scratch, `${name}.raw`))
    const compressed = Uint8Array.from(new zlibt2.Gzip(raw).compress())
    // Gzip stores the modification time in bytes 4–7. Use zero for reproducible assets.
    compressed.fill(0, 4, 8)
    writeFileSync(join(output, `${name}.bin`), compressed)
  }
} finally {
  rmSync(scratch, { recursive: true, force: true })
}
