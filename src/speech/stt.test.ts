import { describe, it, expect, afterEach, vi } from 'vitest'
import { listen, tidyHeard, joinTranscript } from './stt'

class FakeRecognition {
  static last: FakeRecognition | null = null
  lang = ''
  interimResults = false
  maxAlternatives = 1
  continuous = false
  onresult: ((e: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null = null
  onnomatch: (() => void) | null = null
  onend: (() => void) | null = null
  onerror: ((e: { error: string }) => void) | null = null
  started = 0
  constructor() { FakeRecognition.last = this }
  start() { this.started++ }
  stop() { this.onend?.() }
  abort() { this.onend?.() }
}
const w = window as unknown as { SpeechRecognition?: unknown }
const nav = navigator as unknown as { mediaDevices?: unknown }
const tick = () => new Promise((r) => setTimeout(r, 0))

afterEach(() => { delete w.SpeechRecognition; delete nav.mediaDevices; vi.restoreAllMocks() })

describe('listen', () => {
  it('opens the microphone once, releases it, then starts recognition', async () => {
    w.SpeechRecognition = FakeRecognition
    const stop = vi.fn()
    const getUserMedia = vi.fn(async () => ({ getTracks: () => [{ stop }] }))
    nav.mediaDevices = { getUserMedia }
    const onEnd = vi.fn()
    listen('ko-KR', vi.fn(), onEnd)
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
    await tick()
    expect(stop).toHaveBeenCalled()
    expect(FakeRecognition.last?.started).toBe(1)
    expect(FakeRecognition.last?.lang).toBe('ko-KR')
    expect(onEnd).not.toHaveBeenCalled()
  })

  it('reports a denied microphone without starting recognition', async () => {
    w.SpeechRecognition = FakeRecognition
    FakeRecognition.last = null
    nav.mediaDevices = { getUserMedia: vi.fn(async () => { throw new DOMException('denied', 'NotAllowedError') }) }
    const onEnd = vi.fn()
    listen('ko-KR', vi.fn(), onEnd)
    await tick()
    expect(onEnd).toHaveBeenCalledWith('not-allowed')
    expect(FakeRecognition.last).toBeNull()
  })

  it('still starts when getUserMedia is unavailable', () => {
    w.SpeechRecognition = FakeRecognition
    listen('ko-KR', vi.fn(), vi.fn())
    expect(FakeRecognition.last?.started).toBe(1)
  })

  it('ends with no-speech when nothing was heard', () => {
    w.SpeechRecognition = FakeRecognition
    const onEnd = vi.fn()
    listen('ko-KR', vi.fn(), onEnd)
    FakeRecognition.last!.onend?.()
    expect(onEnd).toHaveBeenCalledWith('no-speech')
  })
})

describe('helpers', () => {
  it('joinTranscript concatenates result pieces', () => {
    expect(joinTranscript({ results: { length: 2, 0: { 0: { transcript: '달리' } }, 1: { 0: { transcript: '다' } } } })).toBe('달리다')
  })
  it('tidyHeard strips trailing punctuation and spaces', () => {
    expect(tidyHeard(' 달리다. ')).toBe('달리다')
  })
})
