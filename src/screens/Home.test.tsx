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
  it('shows only Day selects and the two modes, disabled until a Day is picked', () => {
    renderHome({})
    expect(screen.getByLabelText('시작')).toHaveValue('')
    expect(screen.getByLabelText('끝')).toHaveValue('')
    expect(screen.getByText('Day를 골라 주세요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /파생 트리/ })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('link', { name: /학원 모의시험/ })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.queryByText(/예문 빈칸|뜻 고르기|영영 매칭|문장 만들기/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /기록|설정/ })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('단어장')).not.toBeInTheDocument()
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

  it('shows the range name and word count without level stats once a range is set', () => {
    renderHome({ range: { id: 1, name: '10/15 Day 2', bankId: 'b', from: 3, to: 4, createdAt: 0, mockBest: null, academyScore: null },
      rangeWords: [w('c', 3, 'Day 2'), w('d', 4, 'Day 2')] })
    expect(screen.getByText('10/15 Day 2')).toBeInTheDocument()
    expect(screen.getByText(/2단어/)).toBeInTheDocument()
    expect(screen.getByLabelText('시작')).toHaveValue('Day 2')
    expect(screen.queryByText(/확실|익숙|모름|연속/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /파생 트리/ })).not.toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('link', { name: /학원 모의시험/ })).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('shows the error screen', () => {
    renderHome({ status: 'error', error: 'banks/wordmaster.json: 문제' })
    expect(screen.getByText(/아빠에게 알려주세요/)).toBeInTheDocument()
  })
})
