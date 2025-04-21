import type { Directive, FunctionDirective, Plugin } from 'vue'
import { CdxTooltip } from '@wikimedia/codex'

const selectEventListener: EventListener = (event) => {
  const target = event.target as HTMLInputElement
  if (target.tagName === 'INPUT' && target.type === 'text') {
    target.select()
  }
}

const selectAllOnFocus: Directive<HTMLInputElement, boolean> = {
  beforeMount(el, binding) {
    const input = el.querySelector('input[type="text"]') || el
    console.log('selectAllOnFocus', input, binding.value)
    if (binding.value || binding.value === undefined) {
      input.addEventListener('focus', selectEventListener)
    } else {
      // remove event listener
      input.removeEventListener('focus', selectEventListener)
    }
  },
}

const plugin: Plugin = {
  install(app) {
    app.directive('tooltip', CdxTooltip)
    app.directive('select-all-on-focus', selectAllOnFocus)
  },
}

declare module 'vue' {
  interface GlobalDirectives {
    vTooltip: FunctionDirective<
      any,
      (_: string) => void,
      | 'bottom'
      | 'bottom-start'
      | 'bottom-end'
      | 'top'
      | 'top-start'
      | 'top-end'
      | 'right'
      | 'right-start'
      | 'right-end'
      | 'left'
      | 'left-start'
      | 'left-end'
    >
    selectAllOnFocus: typeof selectAllOnFocus
  }
}

export default plugin
