import { describe, expect, it, vi } from 'vitest'
import { isEmbedded, parentOrigin, parentUrl, postMessageParent } from './iframe'

describe('parentOrigin', () => {
  it('should return the origin of the parent URL', () => {
    vi.stubGlobal('location', { hash: '#?url=https://example.com' })

    const origin = parentOrigin()

    expect(origin).toBe('https://example.com')

    vi.unstubAllGlobals()
  })

  it('should return the origin of the document referrer if no URL parameter is provided', () => {
    // Mock the document referrer
    vi.stubGlobal('document', { referrer: 'https://example.com' })

    const origin = parentOrigin()

    expect(origin).toBe('https://example.com')

    vi.unstubAllGlobals()
  })

  it('should return the origin of the current location if no URL parameter or document referrer is provided', () => {
    // Mock the window location href
    vi.stubGlobal('location', { href: 'https://example.com', hash: '' })
    vi.stubGlobal('document', { referrer: '' })

    const origin = parentOrigin()

    expect(origin).toBe('https://example.com')

    vi.unstubAllGlobals()
  })
})

describe('parentUrl', () => {
  it('should return the parent URL', () => {
    // Mock the window location hash with a URL parameter
    vi.stubGlobal('location', { hash: '?#url=https://example.com' })

    const url = parentUrl()

    expect(url.href).toBe('https://example.com/')
    vi.unstubAllGlobals()
  })

  it('should return the document referrer if no URL parameter is provided', () => {
    // Mock the document referrer
    vi.stubGlobal('document', { referrer: 'https://example.com' })

    const url = parentUrl()

    expect(url.href).toBe('https://example.com/')

    vi.unstubAllGlobals()
  })

  it('should return the current location if no URL parameter or document referrer is provided', () => {
    vi.stubGlobal('location', { href: 'https://example.com', hash: '' })

    const url = parentUrl()

    expect(url.href).toBe('https://example.com/')
    vi.unstubAllGlobals()
  })
})

describe('isEmbedded', () => {
  it('should return true if the window is embedded', () => {
    // Mock the window self and top properties to be different
    vi.stubGlobal('self', {})
    vi.stubGlobal('top', {})

    const embedded = isEmbedded()

    expect(embedded).toBe(true)

    vi.unstubAllGlobals()
  })

  it('should return false if the window is not embedded', () => {
    // Mock the window self and top properties to be the same
    const self = {}
    vi.stubGlobal('self', self)
    vi.stubGlobal('top', self)

    const embedded = isEmbedded()

    expect(embedded).toBe(false)
  })
})

describe('postMessageParent', () => {
  it('should post a message to the parent window', () => {
    // Mock the window location hash with an ID parameter
    window.location.hash = '#?id=123'

    // Mock the window parent and postMessage function
    const postMessageMock = vi.fn()
    Object.defineProperty(window, 'parent', { value: { postMessage: postMessageMock } })

    const type = 'messageType'
    const data = { key: 'value' }

    postMessageParent(type, data)

    expect(postMessageMock).toHaveBeenCalledWith({ type, id: '123', data }, '*')
  })
})
