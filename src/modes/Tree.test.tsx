import { describe, it, expect, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AppContext, type AppValue } from '../app/AppContext'
import type { Word } from '../content/schema'
import { resetProgress } from '../store/progress'
import { getSetting } from '../store/ranges'
import Tree from './Tree'

const base: AppValue = { status: 'ready', error: null, bank: { id: 'b', title: 'B', words: [] }, range: null, rangeWords: [], refreshRange: async () => {}, banks: [], bankErrors: [], selectBank: async () => {} }
const mk = (id: string, no: number): Word => ({
  id, no, source: 'Day 1', word: id, pos: 'v.', ipa: '', core: { ko: `${id} 핵심`, en: 'core' },
  senses: [
    { ko: `${id} 뜻1`, en: 'e1', bridge: '', example: `${id} a.`, blank: '____ a.' },
    { ko: `${id} 뜻2`, en: 'e2', bridge: '', example: `${id} b.`, blank: '____ b.' },
  ],
  koGenerated: false, image: null, etymology: null,
})
const words = [mk('run', 1), mk('fine', 2), mk('bank', 3)]

const ui = (rangeWords: Word[], start = 'fine') => (
  <MemoryRouter initialEntries={[`/tree?start=${start}`]}>
    <AppContext.Provider value={{ ...base, rangeWords }}><Tree /></AppContext.Provider>
  </MemoryRouter>
)
const swipe = (dx: number) => {
  const main = screen.getByRole('main')
  fireEvent.touchStart(main, { touches: [{ clientX: 200, clientY: 100 }] })
  fireEvent.touchEnd(main, { changedTouches: [{ clientX: 200 + dx, clientY: 104 }] })
}

beforeEach(async () => { await resetProgress() })

describe('Tree', () => {
  it('honors ?start= even when the range words arrive after mount', () => {
    const { rerender } = render(ui([]))
    expect(screen.getByText('범위에 단어가 없어요.')).toBeInTheDocument()
    rerender(ui([mk('run', 1), mk('fine', 2)]))
    expect(screen.getByText('fine', { selector: '.big' })).toBeInTheDocument()
    expect(screen.getByText('단어 2/2')).toBeInTheDocument()
  })

  it('swipes left for the next word and right for the previous one', () => {
    render(ui(words))
    swipe(-120)
    expect(screen.getByText('bank', { selector: '.big' })).toBeInTheDocument()
    swipe(120)
    expect(screen.getByText('fine', { selector: '.big' })).toBeInTheDocument()
    swipe(20)
    expect(screen.getByText('fine', { selector: '.big' })).toBeInTheDocument()
  })

  it('hide-meanings toggle shows only the word, each tap reveals the next part, and the setting persists', async () => {
    render(ui(words))
    expect(screen.getByText('fine 핵심')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '뜻 가리기' }))
    expect(screen.getByRole('button', { name: '뜻 가리기' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText('fine 핵심')).not.toBeInTheDocument()
    expect(screen.getByText('fine', { selector: '.big' })).toBeInTheDocument()
    await userEvent.click(screen.getByText('fine', { selector: '.big' }))
    expect(screen.getByText('fine 핵심')).toBeInTheDocument()
    expect(screen.queryByText('fine 뜻1')).not.toBeInTheDocument()
    await userEvent.click(screen.getByText('fine 핵심'))
    expect(screen.getByText('fine 뜻1')).toBeInTheDocument()
    expect(screen.queryByText('fine 뜻2')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText('bank', { selector: '.big' })).toBeInTheDocument()
    expect(screen.queryByText('bank 핵심')).not.toBeInTheDocument()
    await waitFor(async () => expect(await getSetting('hideMeanings', false)).toBe(true))
  })

  it('starts hidden when the setting was saved earlier', async () => {
    const { setSetting } = await import('../store/ranges')
    await setSetting('hideMeanings', true)
    render(ui(words))
    await waitFor(() => expect(screen.getByRole('button', { name: '뜻 가리기' })).toHaveAttribute('aria-pressed', 'true'))
    expect(screen.queryByText('fine 핵심')).not.toBeInTheDocument()
  })
})
