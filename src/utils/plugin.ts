import type { Plugin } from 'vue'
import { CdxTooltip } from '@wikimedia/codex'

const plugin: Plugin = {
  install(app) {
    app.directive('tooltip', CdxTooltip)
  },
}

// TODO: provide better typing when https://github.com/vuejs/language-tools/issues/4810 is resolved
// declare module 'vue' {
//   interface GlobalDirectives {
//     vTooltip: FunctionDirective<
//       any,
//       (_: string) => void,
//       | 'bottom'
//       | 'bottom-start'
//       | 'bottom-end'
//       | 'top'
//       | 'top-start'
//       | 'top-end'
//       | 'right'
//       | 'right-start'
//       | 'right-end'
//       | 'left'
//       | 'left-start'
//       | 'left-end'
//     >
//   }
// }

export default plugin
