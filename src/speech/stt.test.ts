import { describe, it, expect, afterEach, vi } from 'vitest'
import { listen, tidyHeard, joinTranscript, describeListenError, probeAvailability } from './stt'

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
    expect(onEnd).toHaveBeenCalledWith(undefined, expect.stringMatching(/result×2 · heard "달리다" · ok/))
  })
})

describe('listen options', () => {
  it('applies interimResults/continuous/maxAlternatives overrides', () => {
    w.SpeechRecognition = FakeRecognition
    listen('en-US', vi.fn(), vi.fn(), { interimResults: false, continuous: true, maxAlternatives: 5 })
    const rec = FakeRecognition.last!
    expect(rec.lang).toBe('en-US')
    expect(rec.interimResults).toBe(false)
    expect(rec.continuous).toBe(true)
    expect(rec.maxAlternatives).toBe(5)
  })

  it('leaves lang unset and skips the microphone pre-open when asked', () => {
    w.SpeechRecognition = FakeRecognition
    const getUserMedia = vi.fn(async () => ({ getTracks: () => [] }))
    nav.mediaDevices = { getUserMedia }
    const onEnd = vi.fn()
    listen('', vi.fn(), onEnd, { preopenMic: false })
    expect(getUserMedia).not.toHaveBeenCalled()
    expect(FakeRecognition.last?.started).toBe(1)
    expect(FakeRecognition.last?.lang).toBe('')
    FakeRecognition.last!.onend?.()
    expect(onEnd).toHaveBeenCalledWith('silent-end', expect.stringMatching(/gum skip/))
  })
})

describe('probeAvailability', () => {
  it('reports the browser answer for cloud and on-device recognition', async () => {
    const available = vi.fn(async (o: { processLocally?: boolean }) => (o.processLocally ? 'downloadable' : 'available'))
    w.SpeechRecognition = Object.assign(class extends FakeRecognition {}, { available })
    const text = await probeAvailability('ko-KR')
    expect(available).toHaveBeenCalledWith({ langs: ['ko-KR'], processLocally: false })
    expect(text).toMatch(/available/)
    expect(text).toMatch(/downloadable/)
  })
  it('says so when the browser has no available()', async () => {
    w.SpeechRecognition = FakeRecognition
    expect(await probeAvailability('ko-KR')).toMatch(/없음/)
  })
})

describe('describeListenError', () => {
  it('explains a silent end like no-speech and points at the keyboard mic', () => {
    const text = describeListenError('silent-end')
    expect(text).toMatch(/못 들었어요/)
    expect(text).toMatch(/키보드/)
    expect(describeListenError('no-speech')).toBe(text)
  })
  it('tells the child to say "정답 곰" when the recognizer rejects a short answer', () => {
    expect(describeListenError('no-match')).toMatch(/정답 곰/)
  })
})

describe('helpers', () => {
  it('joinTranscript concatenates result pieces', () => {
    expect(joinTranscript({ results: { length: 2, 0: { 0: { transcript: '달리' } }, 1: { 0: { transcript: '다' } } } })).toBe('달리다')
  })
  it('tidyHeard strips the "정답" lead-in and polite endings so one-syllable answers survive', () => {
    expect(tidyHeard('정답 곰')).toBe('곰')
    expect(tidyHeard('정답은 곰이에요.')).toBe('곰')
    expect(tidyHeard('곰입니다')).toBe('곰')
    expect(tidyHeard('곰이요')).toBe('곰')
    expect(tidyHeard('곰 요')).toBe('곰')
    expect(tidyHeard('견디다')).toBe('견디다')
    expect(tidyHeard('필요')).toBe('필요')
    expect(tidyHeard('정답')).toBe('')
  })
  it('tidyHeard strips trailing punctuation and spaces', () => {
    expect(tidyHeard(' 달리다. ')).toBe('달리다')
  })
})
