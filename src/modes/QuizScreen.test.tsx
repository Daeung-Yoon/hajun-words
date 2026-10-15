import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AppContext, type AppValue } from '../app/AppContext'
import type { Bank, Word } from '../content/schema'
import { db } from '../store/db'
import { getTodayCount, resetProgress } from '../store/progress'
import { createRange, getCurrentRange } from '../store/ranges'
import QuizScreen from './QuizScreen'

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
const koOf = new Map(words.flatMap((w) => w.senses.map((s) => [s.example, s.ko] as const)))

async function renderQuiz() {
  await createRange({ bankId: 'b', from: 1, to: 3, name: 'r' })
  const range = await getCurrentRange()
  const value: AppValue = { status: 'ready', error: null, bank, banks: [bank], bankErrors: [], range, rangeWords: words,
    refreshRange: async () => {}, selectBank: async () => {} }
  render(<MemoryRouter><AppContext.Provider value={value}><QuizScreen mode="pick" /></AppContext.Provider></MemoryRouter>)
}

async function answerAll() {
  for (let i = 0; i < words.length; i++) {
    const sentence = await screen.findByText((t) => koOf.has(t))
    await userEvent.click(screen.getByRole('button', { name: koOf.get(sentence.textContent!)! }))
    expect(screen.getByText('맞았어요!')).toBeInTheDocument()
    if (i < words.length - 1) await userEvent.click(screen.getByRole('button', { name: '다음' }))
  }
}

beforeEach(async () => { await resetProgress() })

describe('QuizScreen', () => {
  it('records one pick session after a full round', async () => {
    await renderQuiz()
    await answerAll()
    await userEvent.click(screen.getByRole('button', { name: '결과 보기' }))
    await screen.findByRole('button', { name: '한 번 더' })
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
    const sessions = await db.sessions.toArray()
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({ mode: 'pick', total: 3, correct: 3 })
    expect(await getTodayCount()).toBe(3)
  })

  it('records the session only once on a double tap', async () => {
    await renderQuiz()
    await answerAll()
    await userEvent.dblClick(screen.getByRole('button', { name: '결과 보기' }))
    await screen.findByRole('button', { name: '한 번 더' })
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
    expect(await db.sessions.count()).toBe(1)
  })
})
