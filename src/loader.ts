mw.hook('wikipage.content').add(() => {
  const calcs = document.querySelectorAll('.mcw-calc')
  calcs.forEach((calc) => {
    const type = calc.getAttribute('data-type')
    if (!type) {
      console.error('No data-type attribute found on .mcw-calc', calc)
      return
    }
    if (process.env.NODE_ENV === 'development' || localStorage.getItem('mcwCalcLocal') === 'true') {
      console.log('You are in development environment and tools are loaded from localhost.')
      mw.loader.load('@wikimedia/codex')
      mw.loader.load('http://localhost:8080/Gadget-mcw-calc-' + type + '.js')
      importStylesheetURI('http://localhost:8080/Gadget-mcw-calc-' + type + '.css', 'text/css')
    } else {
      mw.loader.load('ext.gadget.mcw-calc-' + type)
    }
  })
})
