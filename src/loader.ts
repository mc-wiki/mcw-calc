const calcs = document.querySelectorAll('.mcw-calc')
calcs.forEach((calc) => {
  const type = calc.getAttribute('data-type')
  if (!type) {
    console.error('No data-type attribute found on .mcw-calc', calc)
    return
  }
  // @ts-expect-error
  mw.loader.using(['vue', '@wikimedia/codex']).then(() => {
    // @ts-expect-error
    mw.loader.load('ext.gadget.mcw-calc-' + type)
  })
})
