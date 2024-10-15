import { postMessageParent } from './utils/iframe'
import { theme as themeRef } from './utils/theme'
import '@wikimedia/codex/dist/codex.style.css'
import './common.less'

// use ResizeObserver to detect change of height and postMessage to parent

const observer = new ResizeObserver(() => {
  postMessageParent('mcw-calc-height-change', { height: document.body.scrollHeight + 10 })
})

for (const child of document.body.children) {
  observer.observe(child)
}

window.addEventListener('message', (event) => {
  if (event.data.type === 'mcw-calc-theme-change') {
    const { theme } = event.data.data
    const { classList } = document.body

    if (theme === 'dark') {
      classList.add('dark')
      themeRef.value = 'dark'
    } else {
      classList.remove('dark')
      themeRef.value = 'light'
    }
  }
})
