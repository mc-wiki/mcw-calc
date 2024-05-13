/// <reference types="types-mediawiki" />

// eslint-disable-next-line no-undef
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

    if (localStorage.getItem('mcwCalcLocal') === 'true') {
      console.log('You are in development environment and tools are loaded from localhost.')
      iframe.src = `http://localhost:5173/tools/${type}/#?id=${id}`
    } else {
      iframe.src = `https://tools.minecraft.wiki/tools/${type}/#?id=${id}`
    }

    // copy all children with .mcw-calc-parameter
    const parameters = calc.querySelectorAll('.mcw-calc-parameter')
    parameters.forEach((parameter) => {
      const iframeParameter = document.createElement('div')
      iframeParameter.className = 'mcw-calc-parameter'
      iframeParameter.innerHTML = parameter.innerHTML
      iframe.appendChild(iframeParameter)
    })

    calc.replaceWith(iframe)

    iframe.style.border = 'none'
    iframe.style.display = 'block'
    iframe.style.width = '100%'

    const dataset = {}
    Object.entries(calc.dataset).forEach(([key, value]) => {
      dataset[key] = value
    })

    window.addEventListener('message', (event) => {
      if (event.origin !== new URL(iframe.src).origin) return
      console.log('message1', event.data)
      if (event.data.data?.id !== id) return

      if (event.data.type === 'mcw-calc-init-request-data') {
        event.source.postMessage(
          {
            type: 'mcw-calc-init',
            data: {
              dataset,
              innerHTML: iframe.innerHTML,
            },
          },
          new URL(iframe.src).origin,
        )
      } else if (event.data.type === 'mcw-calc-height-change') {
        console.log('message2', event.data)
        iframe.style.height = `${event.data.data.height}px`
      }
    })
  })
})
