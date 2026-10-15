import { describe, it, expect, vi } from 'vitest'
import { canSpeak, speak } from './tts'

describe('tts', () => {
  it('reports false when speechSynthesis is missing', () => {
    expect(canSpeak()).toBe(false)
    expect(() => speak('run')).not.toThrow()
  })
  it('speaks with an en-US voice when available', () => {
    const speakFn = vi.fn()
    const cancel = vi.fn()
    const voices = [{ lang: 'ko-KR', name: 'K' }, { lang: 'en-US', name: 'E' }]
    vi.stubGlobal('speechSynthesis', { speak: speakFn, cancel, getVoices: () => voices })
    vi.stubGlobal('SpeechSynthesisUtterance', class { text: string; voice: unknown = null; lang = ''; rate = 1; constructor(t: string) { this.text = t } })
    expect(canSpeak()).toBe(true)
    speak('run')
    expect(cancel).toHaveBeenCalled()
    const u = speakFn.mock.calls[0][0]
    expect(u.text).toBe('run')
    expect(u.voice).toEqual(voices[1])
    vi.unstubAllGlobals()
  })
})
