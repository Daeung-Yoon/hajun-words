import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import WordTree from './WordTree'
import type { Word } from '../content/schema'

const fine: Word = {
  id: 'fine', no: 2, source: 'Day 1', word: 'fine', pos: 'adj., n.', ipa: '/faɪn/',
  core: { ko: '흠 없이 곱게 다듬어진 것', en: 'finished so well that nothing is wrong' },
  senses: [
    { ko: '좋은', en: 'good or healthy', bridge: '흠이 없으면 좋은 것', example: 'I feel fine today.', blank: 'I feel ____ today.' },
    { ko: '벌금', en: 'money you pay for breaking a rule', bridge: "다른 뿌리: '끝내다'에서", example: 'I paid a fine for parking there.', blank: 'I paid a ____ for parking there.' },
  ],
  koGenerated: false, image: null, etymology: '벌금은 finis(끝)에서 왔어요.',
}

describe('WordTree', () => {
  it('renders core, branches, examples with the word highlighted, and etymology', () => {
    const { container } = render(<WordTree word={fine} />)
    expect(screen.getByText('fine', { selector: '.big' })).toBeInTheDocument()
    expect(screen.getByText('흠 없이 곱게 다듬어진 것')).toBeInTheDocument()
    expect(screen.getByText('좋은')).toBeInTheDocument()
    expect(screen.getByText('벌금')).toBeInTheDocument()
    expect(screen.getByText('money you pay for breaking a rule')).toBeInTheDocument()
    expect(screen.getByText(/finis[(]끝[)]/)).toBeInTheDocument()
    expect([...container.querySelectorAll('mark')].map((m) => m.textContent)).toEqual(['fine', 'fine'])
  })
  it('shows my sentences when given', () => {
    render(<WordTree word={fine} mySentences={['That is fine by me.']} />)
    expect(screen.getByText('That is fine by me.')).toBeInTheDocument()
  })
})

describe('WordTree reveal', () => {
  it('reveal=0 shows only the word, then core, then one sense at a time, then etymology', () => {
    const { rerender } = render(<WordTree word={fine} reveal={0} />)
    expect(screen.getByText('fine', { selector: '.big' })).toBeInTheDocument()
    expect(screen.queryByText('흠 없이 곱게 다듬어진 것')).not.toBeInTheDocument()
    expect(screen.queryByText('좋은')).not.toBeInTheDocument()
    rerender(<WordTree word={fine} reveal={1} />)
    expect(screen.getByText('흠 없이 곱게 다듬어진 것')).toBeInTheDocument()
    expect(screen.queryByText('좋은')).not.toBeInTheDocument()
    rerender(<WordTree word={fine} reveal={2} />)
    expect(screen.getByText('좋은')).toBeInTheDocument()
    expect(screen.queryByText('벌금')).not.toBeInTheDocument()
    expect(screen.queryByText(/finis[(]끝[)]/)).not.toBeInTheDocument()
    rerender(<WordTree word={fine} reveal={4} />)
    expect(screen.getByText('벌금')).toBeInTheDocument()
    expect(screen.getByText(/finis[(]끝[)]/)).toBeInTheDocument()
  })
})
