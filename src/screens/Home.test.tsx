import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { AppContext, type AppValue } from '../app/AppContext'
import Home from './Home'

const base: AppValue = { status: 'ready', error: null, bank: { id: 'b', title: 'B', words: [] }, range: null, rangeWords: [], refreshRange: async () => {}, banks: [], bankErrors: [], selectBank: async () => {} }

const renderHome = (v: Partial<AppValue>) =>
  render(<MemoryRouter><AppContext.Provider value={{ ...base, ...v }}><Home /></AppContext.Provider></MemoryRouter>)

describe('Home', () => {
  it('asks to pick a range and disables modes when there is none', () => {
    renderHome({})
    expect(screen.getByText('범위를 골라 주세요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /예문 빈칸/ })).toHaveAttribute('aria-disabled', 'true')
  })
  it('shows range name and word count', () => {
    renderHome({ range: { id: 1, name: '10/15 Day 1', bankId: 'b', from: 1, to: 2, createdAt: 0, mockBest: null, academyScore: null },
      rangeWords: [{ id: 'run', no: 1, source: 'Day 1', word: 'run', pos: '', ipa: '', core: { ko: '', en: '' }, senses: [], koGenerated: false, image: null, etymology: null }] })
    expect(screen.getByText('10/15 Day 1')).toBeInTheDocument()
    expect(screen.getByText(/1단어/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /예문 빈칸/ })).not.toHaveAttribute('aria-disabled', 'true')
  })
  it('shows the error screen', () => {
    renderHome({ status: 'error', error: 'banks/sample.json: 문제' })
    expect(screen.getByText(/아빠에게 알려주세요/)).toBeInTheDocument()
  })
  it('lists banks that failed to load while staying usable', () => {
    renderHome({ bankErrors: ['banks/bad.json: 문제'] })
    expect(screen.getByText(/banks\/bad.json: 문제.*아빠에게 알려주세요/)).toBeInTheDocument()
    expect(screen.getByText('범위를 골라 주세요')).toBeInTheDocument()
  })
})
