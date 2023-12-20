import 'dotenv/config'
import { Mwn } from 'mwn'
import { promises as fs } from 'node:fs'

const env = process.env as {
  API_URL?: string
  API_DEV_URL?: string
  USERNAME: string
  USERNAME_DEV?: string
  PASSWORD: string
  PASSWORD_DEV?: string
  USER_AGENT?: string
}

const manifest = await fs.readFile('./dist/manifest.json', {
  encoding: 'utf-8',
})
const filesProd = JSON.parse(manifest).prod as string[]
const filesDev = JSON.parse(manifest).dev as string[]

const definitionProd = await fs.readFile('./dist/Gadgets-definition', {
  encoding: 'utf-8',
})
const definitionDev = await fs.readFile('./dist/Gadgets-definition.dev', {
  encoding: 'utf-8',
})

Promise.all([
  ...(env.API_URL ? [update('prod', filesProd, definitionProd)] : []),
  ...(env.API_DEV_URL ? [update('dev', filesDev, definitionDev)] : []),
])

async function update(target: 'prod' | 'dev', names: string[], definition: string) {
  const bot = await Mwn.init({
    apiUrl: {
      prod: env.API_URL,
      dev: env.API_DEV_URL,
    }[target],

    username: {
      prod: env.USERNAME,
      dev: env.USERNAME_DEV ?? env.USERNAME,
    }[target],
    password: {
      prod: env.PASSWORD,
      dev: env.PASSWORD_DEV ?? env.PASSWORD,
    }[target],

    userAgent: env.USER_AGENT ?? 'MCWCalcDeploy (mwn/1; +https://github.com/mc-wiki/mcw-calc)',

    defaultParams: {
      assert: 'user',
    },
  })
  const files = names.map((file) => `./dist/${file}`)
  console.log(`Updating for ${target}: ${names.join(', ')}`)

  files.forEach(async (path, index) => {
    const file = await fs.readFile(path, { encoding: 'utf-8' })
    if (names[index] !== 'Gadgets-definition') {
      await bot.save(
        `MediaWiki:${names[index]}`,
        file,
        `Bot: Automatically deploy changes from Git`,
      )
      console.log(`Deployed ${names[index]} to ${target}`)
    }
  })

  bot.edit('MediaWiki:Gadgets-definition', (rev) => {
    // Replace content between two <!-- Automatically generated, your edit will be overwritten -->

    const section = rev.content.match(
      /<!-- Automatically generated, your edit will be overwritten -->\n((.|\n)+)\n<!-- Automatically generated, your edit will be overwritten -->/,
    )![1]
    const text = rev.content.replace(section, definition)
    return {
      text: text,
      summary: `Bot: Automatically deploy changes from Git`,
    }
  })
}
