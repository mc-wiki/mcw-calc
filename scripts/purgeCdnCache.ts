import { glob } from 'glob'
import 'dotenv/config'

const env = process.env

if (env.WG_API_TOKEN === undefined)
  throw new Error('env.WG_API_TOKEN is not defined')

const toolsHtml = await glob('src/tools/*/index.html')
const toolsName = toolsHtml.map(path => path.match(/src\/tools\/(.+)\/index.html/)![1])
const toolsUrl = toolsName.map(name => `https://tools.minecraft.wiki/static/tools/${name}/`)

console.log('Purging:', toolsUrl)

const response = await fetch('https://api.weirdgloop.org/purgecache', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Api-Key ${env.WG_API_TOKEN}`,
  },
  body: JSON.stringify({
    site: 'minecraft.wiki', // CF zone
    urls: toolsUrl,
  }),
})

response.json().then(console.log)
