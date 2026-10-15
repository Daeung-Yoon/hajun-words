import { describe, it, expect } from 'vitest'
import { daysOf, wordsInRange, rangeName } from './range'
import type { Bank } from './schema'

const w = (id: string, no: number, source: string) => ({
  id, no, source, word: id, pos: '', ipa: '', core: { ko: '', en: '' },
  senses: [{ ko: 'k', en: 'e', bridge: '', example: 'a x b', blank: 'a ____ b' }],
  koGenerated: false, image: null, etymology: null,
})
const bank: Bank = { id: 'b', title: 'B', words: [w('a', 3, 'Day 2'), w('b', 1, 'Day 1'), w('c', 2, 'Day 1, Day 5'), w('d', 4, 'Day 2')] }

describe('daysOf', () => {
  it('groups by first source label in number order', () => {
    expect(daysOf(bank)).toEqual([{ label: 'Day 1', from: 1, to: 2 }, { label: 'Day 2', from: 3, to: 4 }])
  })
})
describe('wordsInRange', () => {
  it('returns words in range sorted by no', () => {
    expect(wordsInRange(bank, 2, 3).map((x) => x.id)).toEqual(['c', 'a'])
  })
})
describe('rangeName', () => {
  it('uses day labels without a date when the range matches whole days', () => {
    expect(rangeName(bank, 1, 4)).toBe('Day 1~2')
    expect(rangeName(bank, 3, 4)).toBe('Day 2')
  })
  it('falls back to word numbers', () => {
    expect(rangeName(bank, 2, 3)).toBe('단어 2~3')
  })
})
