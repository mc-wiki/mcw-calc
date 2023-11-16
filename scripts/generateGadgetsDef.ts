import { promises as fs } from 'node:fs'
import { glob } from 'glob'

let def = [
  '== calc ==',
  '* mcw-calc-core[ResourceLoader|targets=desktop,mobile|type=general|default|hidden]|mcw-calc-core.js',
]

const files = await glob('./dist/Gadget-mcw-calc-*.js')
const names = files.map(
  (file) => file.match(/dist\/Gadget-mcw-calc-(.*).js/)![1]
)
const cssFiles = await glob('./dist/Gadget-mcw-calc-*.css')
const cssNames = cssFiles.map(
  (file) => file.match(/dist\/Gadget-mcw-calc-(.*).css/)![1]
)
console.log(`These tools are found: ${names.join(', ')}`)

names.forEach((name) => {
  if (name === 'core') return
  def.push(
    `* mcw-calc-${name}[ResourceLoader|targets=desktop,mobile|type=general|dependencies=vue,@wikimedia/codex|hidden]|mcw-calc-${name}.js${
      cssNames.includes(name) ? `|mcw-calc-${name}.css` : ''
    }`
  )
})

const now = new Date()
def.push(
  `<!-- Automatically generated at ${now.getUTCFullYear()}-${
    now.getUTCMonth() + 1
  }-${now.getUTCDate()} ${now.getUTCHours()}:${now.getUTCMinutes()}:${now.getUTCSeconds()} by generateGadgetsDef.ts -->`
)

fs.writeFile('./dist/Gadgets-definition', def.join('\n'))
