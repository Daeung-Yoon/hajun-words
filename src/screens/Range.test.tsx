import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router'
import { AppContext, type AppValue } from '../app/AppContext'
import Range from './Range'
import { resetProgress } from '../store/progress'
import { getCurrentRange } from '../store/ranges'
import type { Bank } from '../content/schema'

const w = (id: string, no: number, source: string) => ({
  id, no, source, word: id, pos: '', ipa: '', core: { ko: '', en: '' },
  senses: [{ ko: 'k', en: 'e', bridge: '', example: 'a x b', blank: 'a ____ b' }], koGenerated: false, image: null, etymology: null,
})
const bank: Bank = { id: 'b', title: 'B', words: [w('a', 1, 'Day 1'), w('b', 2, 'Day 1'), w('c', 3, 'Day 2'), w('d', 4, 'Day 2')] }
const value: AppValue = { status: 'ready', error: null, bank, range: null, rangeWords: [], refreshRange: async () => {} }

beforeEach(async () => { await resetProgress() })

describe('Range', () => {
  it('saves a day range and navigates home', async () => {
    render(
      <MemoryRouter initialEntries={['/range']}>
        <AppContext.Provider value={value}>
          <Routes><Route path="/range" element={<Range />} /><Route path="/" element={<p>HOME</p>} /></Routes>
        </AppContext.Provider>
      </MemoryRouter>,
    )
    await userEvent.selectOptions(screen.getByLabelText('시작'), 'Day 2')
    await userEvent.selectOptions(screen.getByLabelText('끝'), 'Day 2')
    expect(screen.getByLabelText('시작 번호')).toHaveValue(3)
    await userEvent.click(screen.getByRole('button', { name: '이 범위로 공부하기' }))
    await waitFor(() => expect(screen.getByText('HOME')).toBeInTheDocument())
    const cur = await getCurrentRange()
    expect(cur?.from).toBe(3)
    expect(cur?.to).toBe(4)
    expect(cur?.name).toMatch(/Day 2$/)
  })

  it('reflects the bank and range once they finish loading', async () => {
    const ui = (v: AppValue) => (
      <MemoryRouter initialEntries={['/range']}>
        <AppContext.Provider value={v}>
          <Routes><Route path="/range" element={<Range />} /></Routes>
        </AppContext.Provider>
      </MemoryRouter>
    )
    const { rerender } = render(ui({ ...value, status: 'loading', bank: null }))
    rerender(ui({ ...value, range: { id: 1, name: 'r', bankId: 'b', from: 3, to: 4, createdAt: 0, mockBest: null, academyScore: null } }))
    await waitFor(() => expect(screen.getByLabelText('시작 번호')).toHaveValue(3))
    expect(screen.getByLabelText('끝 번호')).toHaveValue(4)
  })
})
