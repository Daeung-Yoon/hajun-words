import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AppContext, type AppValue } from '../app/AppContext'
import type { Bank, Word } from '../content/schema'
import { db } from '../store/db'
import { getStates, resetProgress } from '../store/progress'
import { createRange, getCurrentRange, listRanges } from '../store/ranges'
import { gradeMockExam } from '../study/grading'
import MockExam from './MockExam'

const mk = (id: string, no: number, senses: [string, string][]): Word => ({
  id, no, source: 'Day 1', word: id, pos: '', ipa: '', core: { ko: 'k', en: 'e' },
  senses: senses.map(([ko, example]) => ({ ko, en: `${ko} en`, bridge: '', example, blank: example.replace(id, '____') })),
  koGenerated: false, image: null, etymology: null,
})
const words = [
  mk('run', 1, [['달리다', 'I run fast.'], ['운영하다', 'They run a shop.']]),
  mk('fine', 2, [['괜찮은', 'I am fine.'], ['벌금', 'Pay the fine.']]),
  mk('bank', 3, [['은행', 'Go to the bank.']]),
]
const bank: Bank = { id: 'b', title: 'B', words }
const answers = { run: ['달리다', '운영하다'], fine: ['', ''], bank: [''] }

async function renderExam() {
  await createRange({ bankId: 'b', from: 1, to: 3, name: 'r' })
  const range = await getCurrentRange()
  const value: AppValue = { status: 'ready', error: null, bank, banks: [bank], bankErrors: [], range, rangeWords: words,
    refreshRange: async () => {}, selectBank: async () => {} }
  render(<MemoryRouter><AppContext.Provider value={value}><MockExam /></AppContext.Provider></MemoryRouter>)
  await userEvent.click(screen.getByRole('button', { name: '시작' }))
  await userEvent.type(screen.getByLabelText('run 뜻 1'), '달리다')
  await userEvent.type(screen.getByLabelText('run 뜻 2'), '운영하다')
}

beforeEach(async () => {
  await resetProgress()
  vi.stubGlobal('scrollTo', vi.fn())
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('MockExam', () => {
  it('grades, records answers and session, and stores the best score', async () => {
    const expected = gradeMockExam(words, answers).score
    await renderExam()
    await userEvent.click(screen.getByRole('button', { name: '채점하기' }))
    expect(await screen.findByText(`${expected}점`)).toBeInTheDocument()
    const sessions = await db.sessions.toArray()
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({ mode: 'mock', total: 3, correct: 1 })
    const states = await getStates(['run', 'fine', 'bank'])
    expect(states.get('run')!.stats.mock).toEqual({ correct: 1, wrong: 0 })
    expect(states.get('fine')!.stats.mock).toEqual({ correct: 0, wrong: 1 })
    expect(states.get('bank')!.stats.mock).toEqual({ correct: 0, wrong: 1 })
    expect((await listRanges())[0].mockBest).toBe(expected)
  })

  it('records only once on a double tap', async () => {
    await renderExam()
    await userEvent.dblClick(screen.getByRole('button', { name: '채점하기' }))
    await screen.findByText(/점$/)
    await waitFor(async () => expect(await db.sessions.count()).toBe(1))
    expect((await getStates(['run'])).get('run')!.stats.mock).toEqual({ correct: 1, wrong: 0 })
  })
})
