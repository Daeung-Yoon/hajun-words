import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppProvider, useApp } from './AppContext'
import { resetProgress } from '../store/progress'
import { createRange, getCurrentRange, getSetting } from '../store/ranges'

const word = (id: string, no: number) => ({
  id, no, source: 'Day 1', word: id, pos: '', ipa: '', core: { ko: 'k', en: 'e' },
  senses: [{ ko: `${id}뜻`, en: 'e', bridge: '', example: `a ${id} b`, blank: 'a ____ b' }],
})
const bank1 = { id: 'one', title: '단어장 1', words: [word('run', 1)] }
const bank2 = { id: 'two', title: '단어장 2', words: [word('fine', 1), word('bank', 2)] }
const index = { banks: [
  { id: 'one', title: '단어장 1', file: 'banks/one.json', wordCount: 1 },
  { id: 'two', title: '단어장 2', file: 'banks/two.json', wordCount: 2 },
] }

function stubFetch(files: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const key = Object.keys(files).find((k) => String(url).endsWith(k))
    if (!key) return new Response('not found', { status: 404 })
    return new Response(JSON.stringify(files[key]), { status: 200 })
  }))
}

function Probe() {
  const { status, bank, banks, bankErrors, range, selectBank } = useApp()
  return (
    <div>
      <button onClick={() => void selectBank('one')}>pick one</button>
      <span data-testid="status">{status}</span>
      <span data-testid="bank">{bank?.id ?? ''}</span>
      <span data-testid="banks">{banks.length}</span>
      <span data-testid="errors">{bankErrors.length}</span>
      <span data-testid="range">{range?.name ?? ''}</span>
    </div>
  )
}

beforeEach(async () => { await resetProgress() })
afterEach(() => { vi.unstubAllGlobals() })

describe('AppProvider', () => {
  it('loads every bank and picks the one the current range belongs to', async () => {
    stubFetch({ 'index.json': index, 'banks/one.json': bank1, 'banks/two.json': bank2 })
    await createRange({ bankId: 'two', from: 1, to: 2, name: 'r2' })
    render(<AppProvider><Probe /></AppProvider>)
    await waitFor(() => expect(screen.getByTestId('range')).toHaveTextContent('r2'))
    expect(screen.getByTestId('status')).toHaveTextContent('ready')
    expect(screen.getByTestId('bank')).toHaveTextContent('two')
    expect(screen.getByTestId('banks')).toHaveTextContent('2')
  })

  it('skips a bank that fails validation and keeps the others', async () => {
    stubFetch({ 'index.json': index, 'banks/one.json': { id: 'one', title: 'x', words: [] }, 'banks/two.json': bank2 })
    render(<AppProvider><Probe /></AppProvider>)
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))
    expect(screen.getByTestId('bank')).toHaveTextContent('two')
    expect(screen.getByTestId('banks')).toHaveTextContent('1')
    expect(screen.getByTestId('errors')).toHaveTextContent('1')
  })

  it('picks the last bank when there is no range or saved choice', async () => {
    stubFetch({ 'index.json': index, 'banks/one.json': bank1, 'banks/two.json': bank2 })
    render(<AppProvider><Probe /></AppProvider>)
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))
    expect(screen.getByTestId('bank')).toHaveTextContent('two')
    expect(screen.getByTestId('banks')).toHaveTextContent('2')
  })

  it('selectBank switches bank, saves the choice and hides a range from another bank', async () => {
    stubFetch({ 'index.json': index, 'banks/one.json': bank1, 'banks/two.json': bank2 })
    await createRange({ bankId: 'two', from: 1, to: 2, name: 'r2' })
    render(<AppProvider><Probe /></AppProvider>)
    await waitFor(() => expect(screen.getByTestId('range')).toHaveTextContent('r2'))
    await userEvent.click(screen.getByRole('button', { name: 'pick one' }))
    await waitFor(() => expect(screen.getByTestId('bank')).toHaveTextContent('one'))
    expect(screen.getByTestId('range')).toHaveTextContent('')
    expect(await getSetting('currentBankId', null)).toBe('one')
    expect((await getCurrentRange())?.name).toBe('r2')
  })
})
