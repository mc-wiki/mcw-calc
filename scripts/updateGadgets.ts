import 'dotenv/config'
import { Mwn } from 'mwn'
import { promises as fs } from 'node:fs'
import { glob } from 'glob'

const env = process.env as {
  API_URL: string
  USERNAME: string
  PASSWORD: string
  USER_AGENT?: string
}

const bot = await Mwn.init({
  apiUrl: env.API_URL,

  username: env.USERNAME,
  password: env.PASSWORD,

  userAgent:
    env.USER_AGENT ??
    'MCWCalc (mwn/1; +https://github.com/Dianliang233/mcw-calc)',

  defaultParams: {
    assert: 'user',
  },
})

const files = [
  ...(await glob('./dist/Gadget-*.{js,css}')),
  ...(await glob('./dist/Gadgets-definition')),
  ...(await glob('./dist/Gadgets-definition.dev')),
]

const names = files.map((file) => file.match(/dist\/(.*)$/)![1])
console.log(`Updating: ${names.join(', ')}`)

files.forEach(async (path, index) => {
  const file = await fs.readFile(path, { encoding: 'utf-8' })
  if (names[index] !== 'Gadgets-definition') {
    await bot.save(
      `MediaWiki:${names[index]}`,
      file,
      `Bot: Automatically deploy changes from Git`
    )
  } else {
    bot.edit('MediaWiki:Gadgets-definition', (rev) => {
      // replace the == calc == section until the next == section
      const text =
        rev.content.replace(/== calc ==(?:.*)*(==)?/s, '') + file + '\n'

      return {
        text: text,
        summary: `Bot: Automatically deploy changes from Git`,
      }
    })
  }
})
