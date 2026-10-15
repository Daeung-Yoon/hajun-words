import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockForm from './MockForm'
import type { Word } from '../content/schema'

const mk = (id: string, kos: string[]): Word => ({
  id, no: 1, source: '', word: id, pos: '', ipa: '', core: { ko: '', en: '' },
  senses: kos.map((ko) => ({ ko, en: 'e', bridge: '', example: `a ${id} b`, blank: 'a ____ b' })), koGenerated: false, image: null, etymology: null,
})

describe('MockForm', () => {
  it('renders one input per sense and submits answers by word id', async () => {
    const onSubmit = vi.fn()
    render(<MockForm words={[mk('run', ['달리다', '흐르다']), mk('bank', ['은행'])]} onSubmit={onSubmit} />)
    expect(screen.getAllByRole('textbox')).toHaveLength(3)
    await userEvent.type(screen.getByLabelText('run 뜻 1'), '달리다')
    await userEvent.type(screen.getByLabelText('run 뜻 2'), '흐르다')
    await userEvent.click(screen.getByRole('button', { name: '채점하기' }))
    expect(onSubmit).toHaveBeenCalledWith({ run: ['달리다', '흐르다'], bank: [''] })
  })
})
