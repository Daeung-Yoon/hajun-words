import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AppContext, type AppValue } from '../app/AppContext'
import Stats from './Stats'
import { resetProgress, recordAnswer } from '../store/progress'
import { createRange, setAcademyScore, updateMockBest } from '../store/ranges'
import type { Word } from '../content/schema'

const w = (id: string, no: number): Word => ({ id, no, source: 'Day 1', word: id, pos: '', ipa: '', core: { ko: '', en: '' },
  senses: [{ ko: 'k', en: 'e', bridge: '', example: 'a x b', blank: 'a ____ b' }], koGenerated: false, image: null, etymology: null })
const words = [w('run', 1), w('fine', 2)]
const value: AppValue = { status: 'ready', error: null, bank: { id: 'b', title: 'B', words }, range: null, rangeWords: words, refreshRange: async () => {}, banks: [], bankErrors: [], selectBank: async () => {} }

beforeEach(async () => { await resetProgress() })

describe('Stats', () => {
  it('lists word levels with a filter and shows range scores', async () => {
    await recordAnswer('run', true, 'blank', 1000)
    await recordAnswer('run', true, 'blank', 1001)
    await createRange({ bankId: 'other', from: 1, to: 2, name: '다른 단어장 범위' }, 900)
    const id = await createRange({ bankId: 'b', from: 1, to: 2, name: '10/15 Day 1' }, 1000)
    await setAcademyScore(id, 90)
    await updateMockBest(id, 80)
    render(<MemoryRouter><AppContext.Provider value={value}><Stats /></AppContext.Provider></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('10/15 Day 1')).toBeInTheDocument())
    expect(screen.queryByText('다른 단어장 범위')).not.toBeInTheDocument()
    expect(screen.getByText('80')).toBeInTheDocument()
    expect(screen.getByText('90')).toBeInTheDocument()
    expect(screen.getByText('run')).toBeInTheDocument()
    expect(screen.getByText('fine')).toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('모름만 보기'))
    expect(screen.queryByText('run')).not.toBeInTheDocument()
    expect(screen.getByText('fine')).toBeInTheDocument()
  })
})
