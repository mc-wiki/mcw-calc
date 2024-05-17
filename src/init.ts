import '@wikimedia/codex/dist/codex.style.css'
import './common.less'

// use ResizeObserver to detect change of height and postMessage to parent

const observer = new ResizeObserver(() => {
  const id = new URLSearchParams(window.location.hash.substring(2)).get('id')
  window.parent.postMessage(
    {
      type: 'mcw-calc-height-change',
      data: { height: document.body.scrollHeight + 5, id },
    },
    '*',
  )
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
    } else {
      classList.remove('dark')
    }
  }
})
