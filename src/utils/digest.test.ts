import { expect, it, describe } from 'vitest'
import { digestMessage } from './digest'
import { vi } from 'vitest'

describe('digestMessage', () => {
  it('should work with SHA-256 as default', async () => {
    const message = 'hello'
    const hash = await digestMessage(message)
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
  })

  it('should work with SHA-1', async () => {
    const message = 'hello'
    const hash = await digestMessage(message, 'SHA-1')
    expect(hash).toBe('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d')
  })

  it('should be able to digest long string', async () => {
    const message = `Exercitation dolore nulla est nulla ut exercitation amet ipsum amet reprehenderit nostrud et cupidatat enim. Voluptate fugiat reprehenderit ipsum proident commodo. Nisi do dolor laborum eu tempor in nulla esse qui ipsum. Id tempor aliquip aute pariatur enim. Ullamco nulla aliqua in laboris exercitation.Exercitation dolore nulla est nulla ut exercitation amet ipsum amet reprehenderit nostrud et cupidatat enim. Voluptate fugiat reprehenderit ipsum proident commodo. Nisi do dolor laborum eu tempor in nulla esse qui ipsum. Id tempor aliquip aute pariatur enim. Ullamco nulla aliqua in laboris exercitation.Exercitation dolore nulla est nulla ut exercitation amet ipsum amet reprehenderit nostrud et cupidatat enim. Voluptate fugiat reprehenderit ipsum proident commodo. Nisi do dolor laborum eu tempor in nulla esse qui ipsum. Id tempor aliquip aute pariatur enim. Ullamco nulla aliqua in laboris exercitation.`
    const hash = await digestMessage(message)
    expect(hash).toBe('5c8d49080eb0d0941fc34f20b3324170f30e60e5fcac619d719c79085d2e47ce')
  })
})
