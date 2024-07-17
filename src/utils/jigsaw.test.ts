import 'mock-local-storage'
import { describe, it, expect, vi } from 'vitest'
import { getJigsawAPI, fetchJigsawAPI } from './jigsaw'

describe('getJigsawAPI', () => {
  it('should return the local API URL if mcwJigsawLocal is true', () => {
    localStorage.setItem('mcwJigsawLocal', 'true')

    const apiURL = getJigsawAPI()

    expect(apiURL).toBe('http://localhost:3000')

    localStorage.removeItem('mcwJigsawLocal')
  })

  it('should return the production API URL if mcwJigsawLocal is false', () => {
    localStorage.setItem('mcwJigsawLocal', 'false')

    const apiURL = getJigsawAPI()

    expect(apiURL).toBe('https://tools.minecraft.wiki/jigsaw')

    localStorage.removeItem('mcwJigsawLocal')
  })

  it('should return the production API URL if mcwJigsawLocal is not set', () => {
    const apiURL = getJigsawAPI()

    expect(apiURL).toBe('https://tools.minecraft.wiki/jigsaw')
  })
})

describe('fetchJigsawAPI', () => {
  it('should fetch the correct URL', () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    fetchJigsawAPI('path')

    expect(mockFetch).toHaveBeenCalledWith('https://tools.minecraft.wiki/jigsaw/path', undefined)

    vi.unstubAllGlobals()
  })

  it('should fetch the correct URL with custom options', () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    const init = { method: 'POST' }
    fetchJigsawAPI('path', init)

    expect(mockFetch).toHaveBeenCalledWith('https://tools.minecraft.wiki/jigsaw/path', init)

    vi.unstubAllGlobals()
  })
})
