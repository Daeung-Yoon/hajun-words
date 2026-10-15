import { describe, it, expect } from 'vitest'
import { mergeWords } from './merge'
import type { Bank, NewWord } from './schema'

const nw = (id: string, source: string): NewWord => ({
  id, source, word: id, pos: '', ipa: '', core: { ko: 'c', en: 'c' },
  senses: [{ ko: 'k', en: 'e', bridge: '', example: `a ${id} b`, blank: 'a ____ b' }], koGenerated: false, image: null, etymology: null,
})

describe('mergeWords', () => {
  it('creates a bank from scratch with numbering from 1', () => {
    const b = mergeWords(null, { id: 'wm', title: 'WM' }, [nw('run', 'Day 1'), nw('fine', 'Day 1')])
    expect(b.id).toBe('wm')
    expect(b.words.map((w) => [w.id, w.no])).toEqual([['run', 1], ['fine', 2]])
  })
  it('appends to an existing bank and merges duplicate ids by source', () => {
    const existing: Bank = mergeWords(null, { id: 'wm', title: 'WM' }, [nw('run', 'Day 1')])
    const b = mergeWords(existing, { id: 'wm', title: 'WM' }, [nw('run', 'Day 3'), nw('bank', 'Day 3'), nw('run', 'Day 3')])
    expect(b.words.map((w) => [w.id, w.no, w.source])).toEqual([['run', 1, 'Day 1, Day 3'], ['bank', 2, 'Day 3']])
    expect(existing.words[0].source).toBe('Day 1')
  })
})
