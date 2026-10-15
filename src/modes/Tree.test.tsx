import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { AppContext, type AppValue } from '../app/AppContext'
import type { Word } from '../content/schema'
import Tree from './Tree'

const base: AppValue = { status: 'ready', error: null, bank: { id: 'b', title: 'B', words: [] }, range: null, rangeWords: [], refreshRange: async () => {} }
const mk = (id: string, no: number): Word => ({ id, no, source: 'Day 1', word: id, pos: '', ipa: '', core: { ko: '', en: '' }, senses: [], koGenerated: false, image: null, etymology: null })

const ui = (rangeWords: Word[]) => (
  <MemoryRouter initialEntries={['/tree?start=fine']}>
    <AppContext.Provider value={{ ...base, rangeWords }}><Tree /></AppContext.Provider>
  </MemoryRouter>
)

describe('Tree', () => {
  it('honors ?start= even when the range words arrive after mount', () => {
    const { rerender } = render(ui([]))
    expect(screen.getByText('범위에 단어가 없어요.')).toBeInTheDocument()
    rerender(ui([mk('run', 1), mk('fine', 2)]))
    expect(screen.getByText('fine', { selector: '.big' })).toBeInTheDocument()
    expect(screen.getByText('파생 트리 2/2')).toBeInTheDocument()
  })
})
