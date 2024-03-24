/**
 * @dependencies vue, @wikimedia/codex
 * @public
 */
import * as vue from 'vue'
import App from './App.vue'
import getParams from '@/utils/getParams.ts'

const targetEl = document.querySelector('.mcw-calc[data-type="blockStructureRenderer"]')!
const createApp =
  process.env.NODE_ENV === 'development' ? vue.createApp : vue.createMwApp || vue.createApp

const params = getParams(
  targetEl,
  ['blocks', 'structure', 'block-states', 'models', 'texture-atlas', 'render-types', 'occlusion-shapes'],
  {
    blocks: 'A=air',
    structure: '-',
    'block-states': 'air={}',
    models: '',
    'texture-atlas': '',
    'render-types': '',
    'occlusion-shapes': '',
  },
)

createApp(App, {
  blocks: params.get('blocks')?.split(';'),
  structure: params.get('structure'),
  blockStates: params.get('block-states')?.split(';'),
  models: params.get('models')?.split(';'),
  textureAtlas: params.get('texture-atlas')?.split(';'),
  renderTypes: params.get('render-types')?.split(';'),
  occlusionShapes: params.get('occlusion-shapes')?.split(';'),
}).mount(targetEl)
