import '@/init'
import * as vue from 'vue'
import App from './App.vue'
import getParams from '@/utils/getParams.ts'
import { createMcwI18n } from '@/utils/i18n'

const targetEl = document.querySelector('#app')!

const params = getParams(
  [
    // Required parameters
    'blocks',
    'structure',
    'block-states',
    'models',
    'texture-atlas',
    'render-types',
    'occlusion-shapes',
    'special-blocks-data',
    'liquid-computation-data',
    // Additional render object
    'marks',
    // Default options
    'camera-pos-data',
    'orthographic',
    'animated-texture',
    'show-invisible-blocks',
    'display-marks',
    'background-color',
    'background-alpha',
  ],
  {
    blocks: '',
    structure: '+',
    'block-states': '',
    models: '',
    'texture-atlas': '',
    'render-types': '',
    'occlusion-shapes': '',
    'special-blocks-data': '',
    'liquid-computation-data': '',
    marks: '',
    'camera-pos-data': '',
    orthographic: 'false',
    'animated-texture': 'true',
    'show-invisible-blocks': 'false',
    'display-marks': 'true',
    'background-color': '#ffffff',
    'background-alpha': '255',
  },
)

const i18n = createMcwI18n(import.meta.glob('./locale/*.json', { eager: true }), 'en')

vue
  .createApp(App, {
    blocks: params.get('blocks')?.split(';'),
    structure: params.get('structure'),
    blockStates: params.get('block-states')?.split(';'),
    models: params.get('models')?.split(';'),
    textureAtlas: params.get('texture-atlas')?.split(';'),
    renderTypes: params.get('render-types')?.split(';'),
    occlusionShapes: params.get('occlusion-shapes')?.split(';'),
    specialBlocksData: params.get('special-blocks-data')?.split(';'),
    liquidComputationData: params.get('liquid-computation-data')?.split(';'),
    marks: params.get('marks')?.split(';'),
    // -------------------------------------------------------------------------------------------
    cameraPosData: params.get('camera-pos-data')?.split(';'),
    orthographicDefault: params.get('orthographic')?.toLocaleLowerCase() === 'true',
    animatedTextureDefault: params.get('animated-texture')?.toLocaleLowerCase() === 'true',
    showInvisibleBlocksDefault: params.get('show-invisible-blocks')?.toLocaleLowerCase() === 'true',
    displayMarksDefault: params.get('display-marks')?.toLocaleLowerCase() === 'true',
    backgroundColorDefault: params.get('background-color') ?? '#ffffff',
    backgroundAlphaDefault: parseInt(params.get('background-alpha') ?? '255'),
  })
  .use(i18n)
  .mount(targetEl)
