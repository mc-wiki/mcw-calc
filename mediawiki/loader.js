/// <reference types="types-mediawiki" />
/* global mw */

mw.hook('wikipage.content').add(() => {
  const calcs = document.querySelectorAll('div.mcw-calc')
  calcs.forEach((calc) => {
    const type = calc.getAttribute('data-type')
    if (!type) {
      console.error('No data-type attribute found on .mcw-calc', calc)
      return
    }

    const iframe = document.createElement('iframe')

    // a random string to use as id
    const id = Math.random().toString(36).substring(7)

    iframe.id = `mcw-calc-${id}`

    const attributes = calc.attributes
    for (let i = 0; i < attributes.length; i++) {
      iframe.setAttribute(attributes[i].name, attributes[i].value)
    }

    let local = mw.config.get('wgContentLanguage')
    if (local === 'zh') {
      local =
        mw.config.get('wgUserVariant') ||
        new URL(window.location.href).searchParams.get('variant') ||
        mw.user.options.get('variant')
    }
    const url = `/tools/${type}/#?id=${id}&locale=${local}&url=${encodeURIComponent(window.location.href)}`

    if (localStorage.getItem('mcwCalcLocal') === 'true') {
      console.log('You are in development environment and tools are loaded from localhost.')
      iframe.src = `http://localhost:5173${url}`
    } else {
      iframe.src = `https://tools.minecraft.wiki/static${url}`
    }

    // copy all children with .mcw-calc-parameter
    const parameters = calc.querySelectorAll('.mcw-calc-parameter')
    parameters.forEach((parameter) => {
      const iframeParameter = document.createElement('div')
      iframeParameter.className = 'mcw-calc-parameter'
      iframeParameter.innerHTML = parameter.innerHTML
      iframe.appendChild(iframeParameter)
    })

    // inherit all styles, we'll set our own later
    iframe.style = calc.style

    calc.replaceWith(iframe)

    iframe.style.border = 'none'
    iframe.style.display = 'block'
    iframe.style.width = '100%'
    iframe.style.colorScheme = 'auto'
    iframe.style.maxWidth = {
      lifeviewer: '600px',
      blockDistribution: '640px',
      interactiveMap: '900px',
      chunkbase: '900px',
    }[type]

    iframe.allow =
      "accelerometer 'src'; clipboard-write 'src'; encrypted-media 'src'; fullscreen 'src'; picture-in-picture 'src'; autoplay 'src'"
    iframe.allowFullscreen = true

    const dataset = {}
    Object.entries(calc.dataset).forEach((entry) => {
      const key = entry[0]
      const value = entry[1]
      dataset[key] = value
    })

    iframe.addEventListener('load', () => {
      iframe.contentWindow.postMessage(
        {
          type: 'mcw-calc-theme-change',
          data: {
            theme: document.body.classList.contains('wgl-theme-light') ? 'light' : 'dark',
          },
        },
        new URL(iframe.src).origin
      )

      mw.hook('wgl.themeChanged').add((theme) => {
        iframe.contentWindow.postMessage(
          {
            type: 'mcw-calc-theme-change',
            data: {
              theme,
            },
          },
          new URL(iframe.src).origin
        )
      })
    })

    window.addEventListener('message', (event) => {
      if (event.origin !== new URL(iframe.src).origin) return
      if (event.data.id !== id) return

      if (event.data.type === 'mcw-calc-init-request-data') {
        event.source.postMessage(
          {
            type: 'mcw-calc-init',
            data: {
              dataset,
              innerHTML: calc.innerHTML,
            },
          },
          new URL(iframe.src).origin
        )
      } else if (event.data.type === 'mcw-calc-height-change') {
        iframe.style.height = `${event.data.data.height}px`
      } else if (event.data.type === 'mcw-calc-clipboard') {
        navigator.clipboard.writeText(event.data.data.text)
      }
    })
  })
})
