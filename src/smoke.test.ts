import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('indexeddb is available in tests', () => {
    expect(typeof indexedDB).toBe('object')
  })
})
