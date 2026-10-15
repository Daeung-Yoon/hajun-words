import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockForm from './MockForm'
import type { Word } from '../content/schema'

const mk = (id: string, kos: string[]): Word => ({
  id, no: 1, source: '', word: id, pos: '', ipa: '', core: { ko: '', en: '' },
  senses: kos.map((ko) => ({ ko, en: 'e', bridge: '', example: `a ${id} b`, blank: 'a ____ b' })), koGenerated: false, image: null, etymology: null,
})
const words = () => [mk('run', ['달리다', '흐르다']), mk('bank', ['은행'])]

afterEach(() => { vi.restoreAllMocks() })

describe('MockForm', () => {
  it('renders one input per sense and submits answers by word id', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onSubmit = vi.fn()
    render(<MockForm words={words()} onSubmit={onSubmit} />)
    expect(screen.getAllByRole('textbox')).toHaveLength(3)
    await userEvent.type(screen.getByLabelText('run 뜻 1'), '달리다')
    await userEvent.type(screen.getByLabelText('run 뜻 2'), '흐르다')
    await userEvent.click(screen.getByRole('button', { name: '채점하기' }))
    expect(confirm).toHaveBeenCalledWith('빈칸이 1개 있어요. 그래도 채점할까요?')
    expect(onSubmit).toHaveBeenCalledWith({ run: ['달리다', '흐르다'], bank: [''] })
  })

  it('Enter does not submit and moves to the next field', async () => {
    const onSubmit = vi.fn()
    render(<MockForm words={words()} onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('run 뜻 1'), '달리다{enter}')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByLabelText('run 뜻 2')).toHaveFocus()
    expect(screen.getByLabelText('run 뜻 1')).toHaveAttribute('enterkeyhint', 'next')
    expect(screen.getByLabelText('bank 뜻 1')).toHaveAttribute('enterkeyhint', 'done')
  })

  it('cancelled confirm does not submit', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const onSubmit = vi.fn()
    render(<MockForm words={words()} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: '채점하기' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not ask when every field is filled', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    const onSubmit = vi.fn()
    render(<MockForm words={[mk('bank', ['은행'])]} onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('bank 뜻 1'), '은행')
    await userEvent.click(screen.getByRole('button', { name: '채점하기' }))
    expect(confirm).not.toHaveBeenCalled()
    expect(onSubmit).toHaveBeenCalledWith({ bank: ['은행'] })
  })
})

describe('MockForm speech input', () => {
  class FakeRecognition {
    static last: FakeRecognition | null = null
    lang = ''
    interimResults = true
    maxAlternatives = 3
    onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null = null
    onend: (() => void) | null = null
    onerror: ((e: { error: string }) => void) | null = null
    started = 0
    constructor() { FakeRecognition.last = this }
    start() { this.started++ }
    stop() { this.onend?.() }
    abort() { this.onend?.() }
  }

  it('shows a mic button per answer that fills the field with what was heard', async () => {
    ;(window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = FakeRecognition
    try {
      render(<MockForm words={words()} onSubmit={vi.fn()} />)
      await userEvent.click(screen.getByRole('button', { name: 'run 뜻 2 말하기' }))
      const rec = FakeRecognition.last!
      expect(rec.started).toBe(1)
      expect(rec.lang).toBe('ko-KR')
      expect(screen.getByRole('button', { name: 'run 뜻 2 말하기' })).toHaveAttribute('aria-pressed', 'true')
      act(() => { rec.onresult?.({ results: { 0: { 0: { transcript: '흐르다.' } } } }); rec.onend?.() })
      expect(screen.getByLabelText('run 뜻 2')).toHaveValue('흐르다')
      expect(screen.getByLabelText('run 뜻 1')).toHaveValue('')
      expect(screen.getByRole('button', { name: 'run 뜻 2 말하기' })).toHaveAttribute('aria-pressed', 'false')
    } finally {
      delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition
    }
  })

  it('shows why listening failed next to the field', async () => {
    ;(window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = FakeRecognition
    try {
      render(<MockForm words={words()} onSubmit={vi.fn()} />)
      await userEvent.click(screen.getByRole('button', { name: 'bank 뜻 1 말하기' }))
      const rec = FakeRecognition.last!
      act(() => { rec.onerror?.({ error: 'not-allowed' }); rec.onend?.() })
      expect(screen.getByText(/마이크 권한/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'bank 뜻 1 말하기' })).toHaveAttribute('aria-pressed', 'false')
      await userEvent.click(screen.getByRole('button', { name: 'bank 뜻 1 말하기' }))
      act(() => { FakeRecognition.last!.onerror?.({ error: 'no-speech' }); FakeRecognition.last!.onend?.() })
      expect(screen.getByText(/못 들었어요/)).toBeInTheDocument()
    } finally {
      delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition
    }
  })

  it('hides mic buttons when the browser cannot listen', () => {
    render(<MockForm words={words()} onSubmit={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /말하기/ })).not.toBeInTheDocument()
  })
})
