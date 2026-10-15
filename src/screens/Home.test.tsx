import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AppContext, type AppValue } from '../app/AppContext'
import type { Bank, Word } from '../content/schema'
import { resetProgress } from '../store/progress'
import { getCurrentRange, listRanges } from '../store/ranges'
import Home from './Home'

const w = (id: string, no: number, source: string): Word => ({
  id, no, source, word: id, pos: '', ipa: '', core: { ko: '', en: '' },
  senses: [{ ko: 'k', en: 'e', bridge: '', example: 'a x b', blank: 'a ____ b' }], koGenerated: false, image: null, etymology: null,
})
const bank: Bank = { id: 'b', title: 'B', words: [w('a', 1, 'Day 1'), w('b', 2, 'Day 1'), w('c', 3, 'Day 2'), w('d', 4, 'Day 2')] }
const base: AppValue = { status: 'ready', error: null, bank, range: null, rangeWords: [], refreshRange: async () => {}, banks: [bank], bankErrors: [], selectBank: async () => {} }

const renderHome = (v: Partial<AppValue>) =>
  render(<MemoryRouter><AppContext.Provider value={{ ...base, ...v }}><Home /></AppContext.Provider></MemoryRouter>)

beforeEach(async () => { await resetProgress() })

describe('Home', () => {
  it('shows Day selects, asks to pick a Day and disables modes when there is no range', () => {
    renderHome({})
    expect(screen.getByLabelText('시작')).toHaveValue('')
    expect(screen.getByLabelText('끝')).toHaveValue('')
    expect(screen.getByText('Day를 골라 주세요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /예문 빈칸/ })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.queryByRole('link', { name: /범위/ })).not.toBeInTheDocument()
  })

  it('picking a Day saves it as the current range right away', async () => {
    const refreshRange = vi.fn(async () => {})
    renderHome({ refreshRange })
    await userEvent.selectOptions(screen.getByLabelText('시작'), 'Day 2')
    await waitFor(() => expect(refreshRange).toHaveBeenCalled())
    const cur = await getCurrentRange()
    expect(cur).toMatchObject({ bankId: 'b', from: 3, to: 4 })
    expect(cur?.name).toMatch(/Day 2$/)
  })

  it('picking the same Day twice keeps one range record', async () => {
    renderHome({})
    await userEvent.selectOptions(screen.getByLabelText('시작'), 'Day 1')
    await waitFor(async () => expect(await listRanges()).toHaveLength(1))
    await userEvent.selectOptions(screen.getByLabelText('끝'), 'Day 1')
    await new Promise((r) => setTimeout(r, 50))
    expect(await listRanges()).toHaveLength(1)
  })

  it('shows the current range name, word count and Day selects filled in', () => {
    renderHome({ range: { id: 1, name: '10/15 Day 2', bankId: 'b', from: 3, to: 4, createdAt: 0, mockBest: null, academyScore: null },
      rangeWords: [w('c', 3, 'Day 2'), w('d', 4, 'Day 2')] })
    expect(screen.getByText('10/15 Day 2')).toBeInTheDocument()
    expect(screen.getByText(/2단어/)).toBeInTheDocument()
    expect(screen.getByLabelText('시작')).toHaveValue('Day 2')
    expect(screen.getByLabelText('끝')).toHaveValue('Day 2')
    expect(screen.getByRole('link', { name: /예문 빈칸/ })).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('shows a bank selector only when there are several banks', async () => {
    const other: Bank = { id: 'other', title: '다른 단어장', words: [w('z', 1, 'Day 1')] }
    const selectBank = vi.fn(async () => {})
    renderHome({ banks: [bank, other], selectBank })
    expect(screen.getByLabelText('단어장')).toHaveValue('b')
    await userEvent.selectOptions(screen.getByLabelText('단어장'), 'other')
    expect(selectBank).toHaveBeenCalledWith('other')
  })

  it('shows the error screen', () => {
    renderHome({ status: 'error', error: 'banks/sample.json: 문제' })
    expect(screen.getByText(/아빠에게 알려주세요/)).toBeInTheDocument()
  })

  it('lists banks that failed to load while staying usable', () => {
    renderHome({ bankErrors: ['banks/bad.json: 문제'] })
    expect(screen.getByText(/banks\/bad.json: 문제.*아빠에게 알려주세요/)).toBeInTheDocument()
    expect(screen.getByText('Day를 골라 주세요')).toBeInTheDocument()
  })
})
