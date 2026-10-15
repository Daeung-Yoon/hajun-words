import { describe, it, expect, vi, afterEach } from 'vitest'
import { loadBank, BankLoadError } from './loadBank'

const bank = {
  id: 'b',
  title: 'B',
  words: [
    {
      id: 'run', no: 1, source: 'Day 1', word: 'run', pos: 'v.', ipa: '',
      core: { ko: '핵심', en: 'core' },
      senses: [{ ko: '뜻', en: 'meaning', bridge: '', example: 'I run now.', blank: 'I ____ now.' }],
    },
  ],
}

afterEach(() => vi.unstubAllGlobals())

describe('loadBank', () => {
  it('wraps network failures in BankLoadError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const err = await loadBank('banks/x.json').catch((e) => e)
    expect(err).toBeInstanceOf(BankLoadError)
    expect(err.message).toContain('불러올 수 없어요')
  })
  it('throws BankLoadError on non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    await expect(loadBank('banks/x.json')).rejects.toBeInstanceOf(BankLoadError)
  })
  it('resolves a valid bank', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => bank })
    vi.stubGlobal('fetch', fetchMock)
    const result = await loadBank('banks/x.json')
    expect(result.id).toBe('b')
    expect(fetchMock).toHaveBeenCalledWith('/content/banks/x.json', { cache: 'no-cache' })
  })
})
