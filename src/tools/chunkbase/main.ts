import '@/init'
import * as vue from 'vue'
import App from './App.vue'
import getParams from '@/utils/getParams'
import { createMcwI18n } from '@/utils/i18n'
import { hashCode } from '@/utils/seed'

const targetEl = document.querySelector('#app')!

const i18n = createMcwI18n(import.meta.glob('./locale/*.json', { eager: true }))

;(async () => {
  const params = await getParams(
    [
      'seed',
      'show-biomes',
      'show-heights',
      'platform',
      'poi',
      'biome-height',
      'zoom',
      'x',
      'z',
      'dimension',
      'promo',
    ],
    {
      seed: crypto.getRandomValues(new BigInt64Array(1))[0].toString(),
      'show-biomes': 'true',
      'show-heights': 'true',
      platform: 'java_1_21',
      poi: 'null',
      'biome-height': 'depth0',
      zoom: '0',
      x: '0',
      z: '0',
      dimension: 'overworld',
      promo: 'true',
    },
  )

  console.log(params)

  let seed: bigint
  try {
    seed = BigInt(params.get('seed')!)
  } catch (e) {
    seed = BigInt(hashCode(params.get('seed')!))
  }

  vue
    .createApp(App, {
      seed: seed,
      showBiomes: !!params.get('show-biomes'),
      showHeights: !!params.get('show-heights'),
      platform: params.get('platform'),
      poi: params.get('poi') === 'null' ? null : params.get('poi'),
      biomeHeight: params.get('biome-height'),
      zoom: params.get('zoom'),
      x: parseInt(params.get('x')!),
      z: parseInt(params.get('z')!),
      dimension: params.get('dimension'),
      promo: !!params.get('promo'),
    })
    .use(i18n)
    .mount(targetEl)
})()
