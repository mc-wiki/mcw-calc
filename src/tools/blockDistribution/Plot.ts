import { defineComponent, h, withDirectives, type PropType } from 'vue'

export default defineComponent({
  props: {
    element: SVGElement as PropType<SVGElement | null>,
  },
  render() {
    const { element } = this
    return withDirectives(h('div'), [
      [
        {
          mounted(el: HTMLElement) {
            if (element) {
              el.append(element)
            }
          },
        },
      ],
    ])
  },
})
