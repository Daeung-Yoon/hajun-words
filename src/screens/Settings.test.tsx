import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AppContext, type AppValue } from '../app/AppContext'
import Settings from './Settings'
import { resetProgress } from '../store/progress'
import { createRange, listRanges, getSetting, setAcademyScore } from '../store/ranges'
import { exportAll } from '../store/exportImport'

const value: AppValue = { status: 'ready', error: null, bank: { id: 'b', title: 'B', words: [] }, range: null, rangeWords: [], refreshRange: async () => {}, banks: [], bankErrors: [], selectBank: async () => {} }
const renderIt = () => render(<MemoryRouter><AppContext.Provider value={value}><Settings /></AppContext.Provider></MemoryRouter>)

beforeEach(async () => { await resetProgress() })

describe('Settings', () => {
  it('saves academy score for a range', async () => {
    await createRange({ bankId: 'other', from: 1, to: 2, name: 'r0' }, 1000)
    await createRange({ bankId: 'b', from: 1, to: 2, name: 'r1' })
    renderIt()
    const input = await screen.findByLabelText('r1 학원 점수')
    expect(screen.queryByLabelText('r0 학원 점수')).not.toBeInTheDocument()
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
  it('exports with the link attached to the page and revokes the URL later', async () => {
    const created = vi.fn(() => 'blob:x')
    const revoked = vi.fn()
    Object.assign(URL, { createObjectURL: created, revokeObjectURL: revoked })
    let attached: boolean | null = null
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { attached = this.isConnected })
    renderIt()
    await userEvent.click(await screen.findByRole('button', { name: /내보내기/ }))
    await waitFor(() => expect(click).toHaveBeenCalled())
    expect(attached).toBe(true)
    expect(document.querySelector('a[download]')).toBeNull()
    expect(revoked).not.toHaveBeenCalled()
    await waitFor(() => expect(revoked).toHaveBeenCalledWith('blob:x'), { timeout: 2000 })
    vi.restoreAllMocks()
  })
  it('shows imported academy scores instead of stale input values', async () => {
    const id = await createRange({ bankId: 'b', from: 1, to: 2, name: 'r1' })
    await setAcademyScore(id, 70)
    const json = await exportAll()
    await setAcademyScore(id, 85)
    renderIt()
    const input = await screen.findByLabelText('r1 학원 점수')
    expect(input).toHaveValue(85)
    await userEvent.upload(screen.getByLabelText(/가져오기/), new File([json], 'p.json', { type: 'application/json' }))
    await screen.findByText('가져왔어요')
    expect(await screen.findByLabelText('r1 학원 점수')).toHaveValue(70)
  })
})
