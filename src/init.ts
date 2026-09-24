import { postMessageParent } from './utils/iframe'
import { applyTheme } from './utils/theme'
import './common.css'
import './common.less'

const trustedWikiOriginPattern =
  /^(?:https?:\/\/)?(?:www\.)?(?:minecraft\.wiki|.*\.minecraft\.wiki)$/

function sendHeightChange() {
  return () => {
    postMessageParent('mcw-calc-height-change', { height: document.body.scrollHeight + 10 })
  }
}

// use ResizeObserver to detect change of height and postMessage to parent
const observer = new ResizeObserver(sendHeightChange())

// listen to fullscreen
document.addEventListener('fullscreenchange', sendHeightChange)

for (const child of document.body.children) {
  observer.observe(child)
}

window.addEventListener('message', (event) => {
  if (!trustedWikiOriginPattern.test(event.origin)) {
    return
  }

  if (event.data.type === 'mcw-calc-theme-change') {
    const { theme } = event.data.data
    applyTheme(theme === 'dark' ? 'dark' : 'light')
  } else if (event.data.type === 'mcw-calc-styles') {
    const { styles } = event.data.data
    const styleEl = document.createElement('style')
    styleEl.innerHTML = styles
    document.head.appendChild(styleEl)
  }
})

postMessageParent('mcw-calc-init-request-styles', {
  type: new URL(window.location.href).pathname.split('/').slice(-2, -1)[0],
})

const locale =
  new URLSearchParams(window.location.hash.substring(2)).get('locale') ??
  window.navigator.language.split('-')[0]
document.body.lang = locale ?? 'en'
