import { plot, type PlotOptions } from '@observablehq/plot'
import { defineComponent, h, withDirectives, type PropType } from 'vue'

export default defineComponent({
  props: {
    options: Object as PropType<PlotOptions>,
  },
  render() {
    const { options } = this
    return withDirectives(h('div'), [
      [
        {
          mounted(el) {
            el.append(plot(options))
          },
        },
      ],
    ])
  },
})
