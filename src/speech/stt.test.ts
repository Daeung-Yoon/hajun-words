import { describe, it, expect, afterEach, vi } from 'vitest'
import { listen, tidyHeard, joinTranscript, describeListenError } from './stt'

class FakeRecognition {
  static last: FakeRecognition | null = null
  lang = ''
  interimResults = false
  maxAlternatives = 1
  continuous = false
  onstart: (() => void) | null = null
  onaudiostart: (() => void) | null = null
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
    expect(onEnd).toHaveBeenCalledWith('not-allowed', expect.stringMatching(/gum NotAllowedError/))
    expect(FakeRecognition.last).toBeNull()
  })

  it('still starts when getUserMedia is unavailable', () => {
    w.SpeechRecognition = FakeRecognition
    listen('ko-KR', vi.fn(), vi.fn())
    expect(FakeRecognition.last?.started).toBe(1)
  })

  it('ends with silent-end and a trace when recognition stops with no result and no error', async () => {
    w.SpeechRecognition = FakeRecognition
    nav.mediaDevices = { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] })) }
    const onEnd = vi.fn()
    listen('ko-KR', vi.fn(), onEnd)
    await tick()
    const rec = FakeRecognition.last!
    rec.onstart?.()
    rec.onaudiostart?.()
    rec.onend?.()
    expect(onEnd).toHaveBeenCalledTimes(1)
    const [error, trace] = onEnd.mock.calls[0] as [string, string]
    expect(error).toBe('silent-end')
    expect(trace).toMatch(/gum ok/)
    expect(trace).toMatch(/start/)
    expect(trace).toMatch(/audiostart/)
    expect(trace).toMatch(/end \d+ms/)
    expect(trace).toMatch(/silent-end$/)
  })

  it('passes a real no-speech error through and shows it in the trace', () => {
    w.SpeechRecognition = FakeRecognition
    const onEnd = vi.fn()
    listen('ko-KR', vi.fn(), onEnd)
    const rec = FakeRecognition.last!
    rec.onerror?.({ error: 'no-speech' })
    rec.onend?.()
    expect(onEnd).toHaveBeenCalledWith('no-speech', expect.stringMatching(/error no-speech/))
  })

  it('counts results in the trace', () => {
    w.SpeechRecognition = FakeRecognition
    const onEnd = vi.fn()
    listen('ko-KR', vi.fn(), onEnd)
    const rec = FakeRecognition.last!
    rec.onresult?.({ results: { length: 1, 0: { 0: { transcript: '달' } } } })
    rec.onresult?.({ results: { length: 1, 0: { 0: { transcript: '달리다' } } } })
    rec.onend?.()
    expect(onEnd).toHaveBeenCalledWith(undefined, expect.stringMatching(/result×2/))
  })
})

describe('describeListenError', () => {
  it('explains a silent end like no-speech and points at the keyboard mic', () => {
    const text = describeListenError('silent-end')
    expect(text).toMatch(/못 들었어요/)
    expect(text).toMatch(/키보드/)
    expect(describeListenError('no-speech')).toBe(text)
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
