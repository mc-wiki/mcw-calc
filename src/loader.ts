const calcs = document.querySelectorAll('.mcw-calc')
calcs.forEach((calc) => {
  const type = calc.getAttribute('data-type')
  if (!type) {
    console.error('No data-type attribute found on .mcw-calc', calc)
    return
  }
  if (process.env.NODE_ENV === 'development' || localStorage.getItem('mcwCalcLocal') === 'true') {
    mw.loader.load('http://localhost:8080/Gadget-mcw-calc-' + type + '.js')
  } else {
    mw.loader.load('ext.gadget.mcw-calc-' + type)
  }
})
