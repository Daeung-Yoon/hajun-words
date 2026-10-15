import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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
