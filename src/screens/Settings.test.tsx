import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AppContext, type AppValue } from '../app/AppContext'
import Settings from './Settings'
import { resetProgress } from '../store/progress'
import { createRange, listRanges, getSetting } from '../store/ranges'

const value: AppValue = { status: 'ready', error: null, bank: { id: 'b', title: 'B', words: [] }, range: null, rangeWords: [], refreshRange: async () => {} }
const renderIt = () => render(<MemoryRouter><AppContext.Provider value={value}><Settings /></AppContext.Provider></MemoryRouter>)

beforeEach(async () => { await resetProgress() })

describe('Settings', () => {
  it('saves academy score for a range', async () => {
    await createRange({ bankId: 'b', from: 1, to: 2, name: 'r1' })
    renderIt()
    const input = await screen.findByLabelText('r1 학원 점수')
    await userEvent.type(input, '85')
    await userEvent.tab()
    await waitFor(async () => expect((await listRanges())[0].academyScore).toBe(85))
  })
  it('toggles blank input mode', async () => {
    renderIt()
    await userEvent.click(await screen.findByLabelText('빈칸 직접 입력'))
    await waitFor(async () => expect(await getSetting('blankInputMode', 'choice')).toBe('typing'))
  })
  it('resets only after confirm', async () => {
    await createRange({ bankId: 'b', from: 1, to: 2, name: 'r1' })
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderIt()
    await userEvent.click(await screen.findByRole('button', { name: '진도 초기화' }))
    expect(await listRanges()).toHaveLength(1)
    vi.restoreAllMocks()
  })
})
