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
    'MediaWiki:Gadgets-mcw-calc-loader.js',
    loaderContent,
    `Bot: Automatically deploy changes from Git (${commitHash.trim().substring(0, 6)})`,
  )
}
