import 'dotenv/config'
import { Mwn } from 'mwn'
import { promises as fs } from 'node:fs'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { DeployTarget, targets } from './deployConfig'

const { stdout: commitHash } = await promisify(exec)('git rev-parse HEAD')

const env = process.env

const loaderContent = await fs.readFile('./mediawiki/loader.js', {
  encoding: 'utf-8',
})

const promises = targets.map((target) => update(target))

for (const promise of promises) {
  await promise
}

async function update(target: DeployTarget) {
  const bot = await Mwn.init({
    apiUrl: target.apiUrl,

    // username: env[`USERNAME_${target.credentials}`],
    // password: env[`PASSWORD_${target.credentials}`],

    OAuth2AccessToken: env[`ACCESS_TOKEN_${target.credentials}`],

    userAgent: env.USER_AGENT ?? 'MCWCalcDeploy (mwn/1; +https://github.com/mc-wiki/mcw-calc)',

    defaultParams: {
      assert: 'user',
    },
  })

  bot.save(
    'MediaWiki:Gadget-mcw-calc-loader.js',
    loaderContent,
    `Bot: Automatically deploy changes from Git (${commitHash.trim().substring(0, 6)})`,
  )

  bot.edit('MediaWiki:Gadgets-definition', (rev) => {
    // Replace content between two <!-- Automatically generated, your edit will be overwritten -->

    const section = rev.content.match(
      /<!-- Automatically generated, your edit will be overwritten -->\n((.|\n)+)\n<!-- Automatically generated, your edit will be overwritten -->/,
    )
    if (section !== null && section.length > 1) {
      const text = rev.content.replace(
        section[1],
        `* mcw-calc-loader[ResourceLoader|type=general|default|hidden]|mcw-calc-loader.js`,
      )
      return {
        text: text,
        summary: `Bot: Upgrade to the new mcw-calc system (${commitHash.trim().substring(0, 6)})`,
      }
    }

    return rev.content
  })
}
