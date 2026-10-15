import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import MicTest from './MicTest'

class FakeRecognition {
  static last: FakeRecognition | null = null
  lang = ''
  interimResults = false
  maxAlternatives = 1
  continuous = false
  onresult: ((e: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null = null
  onend: (() => void) | null = null
  onerror: ((e: { error: string }) => void) | null = null
  started = 0
  constructor() { FakeRecognition.last = this }
  start() { this.started++ }
  stop() { this.onend?.() }
  abort() { this.onend?.() }
}
const w = window as unknown as { SpeechRecognition?: unknown }
afterEach(() => { delete w.SpeechRecognition; vi.restoreAllMocks() })

describe('MicTest', () => {
  it('runs the chosen variant and shows what was heard and the trace under it', async () => {
    w.SpeechRecognition = FakeRecognition
    render(<MemoryRouter><MicTest /></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: /영어 en-US/ }))
    const rec = FakeRecognition.last!
    expect(rec.lang).toBe('en-US')
    act(() => { rec.onresult?.({ results: { length: 1, 0: { 0: { transcript: 'apple' } } } }); rec.onend?.() })
    expect(screen.getByText(/들은 말: apple/)).toBeInTheDocument()
    expect(screen.getByText(/진단: .*result×1 · heard "apple" · ok/)).toBeInTheDocument()
  })

  it('shows the error code in the trace when a variant fails', async () => {
    w.SpeechRecognition = FakeRecognition
    render(<MemoryRouter><MicTest /></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: /중간 결과 끄기/ }))
    expect(FakeRecognition.last?.interimResults).toBe(false)
    act(() => { FakeRecognition.last!.onend?.() })
    expect(screen.getByText(/진단: .*silent-end/)).toBeInTheDocument()
  })
})
