import { promises as fs } from 'node:fs'
import { glob } from 'glob'
import parseJSDoc from './parseJSDoc.js'

const def = [
  '* mcw-calc-core[ResourceLoader|targets=desktop,mobile|type=general|default|hidden]|mcw-calc-core.js|mcw-calc-core.css',
]

const localMessagesDef = [
  '* mcw-calc-core[ResourceLoader|targets=desktop,mobile|type=general|default|hidden]|mcw-calc-core.js|mcw-calc-core.css',
]

const devDef = [
  '* mcw-calc-core[ResourceLoader|targets=desktop,mobile|type=general|default|hidden]|mcw-calc-core.js|mcw-calc-core.css',
]

const manifest = {
  prod: ['Gadget-mcw-calc-core.js', 'Gadget-mcw-calc-core.css'] as string[],
  dev: ['Gadget-mcw-calc-core.js', 'Gadget-mcw-calc-core.css'] as string[],
}

const files = await glob('./dist/Gadget-mcw-calc-*.js', { posix: true })
const names = files.map((file) => file.match(/dist\/Gadget-mcw-calc-(.*).js/)![1])
const cssFiles = await glob('./dist/Gadget-mcw-calc-*.css', { posix: true })
const cssNames = cssFiles.map((file) => file.match(/dist\/Gadget-mcw-calc-(.*).css/)![1])
console.log(`These tools are found: ${names.join(', ')}`)

for (const name of names) {
  if (name === 'core') continue
  const module = await fs.readFile(`./src/tools/${name}/main.ts`, {
    encoding: 'utf-8',
  })
  const jsdoc = parseJSDoc(module)
  const dependencies = jsdoc.dependencies
  if (jsdoc.public) {
    def.push(
      `* mcw-calc-${name}[ResourceLoader|targets=desktop,mobile|package|type=general${
        dependencies ? `|dependencies=${dependencies.replace(/ /g, '')}` : ''
      }|hidden]|mcw-calc-${name}.js${cssNames.includes(name) ? `|mcw-calc-${name}.css` : ''}`,
    )
    localMessagesDef.push(
      `* mcw-calc-${name}[ResourceLoader|targets=desktop,mobile|package|type=general${
        dependencies ? `|dependencies=${dependencies.replace(/ /g, '')}` : ''
      }|hidden]|mcw-calc-${name}.js${
        cssNames.includes(name) ? `|mcw-calc-${name}.css` : ''
      }|mcw-calc-${name}-locales.json`,
    )
    manifest.prod.push(`Gadget-mcw-calc-${name}.js`)
    if (cssNames.includes(name)) manifest.prod.push(`Gadget-mcw-calc-${name}.css`)
  }

  if (!jsdoc.deprecated && !jsdoc.internal) {
    devDef.push(
      `* mcw-calc-${name}[ResourceLoader|targets=desktop,mobile|package|type=general${
        dependencies ? `|dependencies=${dependencies.replace(/ /g, '')}` : ''
      }|hidden]|mcw-calc-${name}.js${cssNames.includes(name) ? `|mcw-calc-${name}.css` : ''}`,
    )
    manifest.dev.push(`Gadget-mcw-calc-${name}.js`)
    if (cssNames.includes(name)) manifest.dev.push(`Gadget-mcw-calc-${name}.css`)
  }
}

fs.writeFile('./dist/Gadgets-definition', def.join('\n'), 'utf-8')
fs.writeFile('./dist/Gadgets-definition.dev', devDef.join('\n'), 'utf-8')
fs.writeFile('./dist/Gadgets-definition.localMessages', localMessagesDef.join('\n'), 'utf-8')
fs.writeFile('./dist/manifest.json', JSON.stringify(manifest, undefined, 2), 'utf-8')
