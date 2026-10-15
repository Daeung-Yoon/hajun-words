import { describe, it, expect } from 'vitest'
import { pickWords, buildBlankQuestion, buildPickQuestion, buildRound, shuffle } from './picker'
import { initialState, type WordState } from './level'
import type { Word } from '../content/schema'

const mk = (id: string, no: number, kos: string[]): Word => ({
  id, no, source: 'Day 1', word: id, pos: '', ipa: '', core: { ko: 'c', en: 'c' },
  senses: kos.map((ko, i) => ({ ko, en: `${id} meaning ${i}`, bridge: '', example: `I ${id}${i} it.`, blank: 'I ____ it.' })),
  koGenerated: false, image: null, etymology: null,
})
const words = [mk('run', 1, ['달리다', '운영하다', '흐르다', '작동하다']), mk('fine', 2, ['좋은', '벌금']),
  mk('charge', 3, ['청구하다']), mk('draw', 4, ['그리다']), mk('bank', 5, ['은행'])]
const states = (lv: Record<string, 0 | 1 | 2 | 3>) =>
  new Map<string, WordState>(words.map((w) => [w.id, { ...initialState(w.id), level: lv[w.id] ?? 0 }]))
const seq = (vals: number[]) => { let i = 0; return () => vals[i++ % vals.length] }

describe('shuffle', () => {
  it('returns a permutation without mutating input', () => {
    const arr = [1, 2, 3, 4]
    const out = shuffle(arr, seq([0.9, 0.1, 0.5]))
    expect(out.sort()).toEqual([1, 2, 3, 4])
    expect(arr).toEqual([1, 2, 3, 4])
  })
})

describe('pickWords', () => {
  it('returns at most count distinct words', () => {
    const out = pickWords(words, states({}), 3, 0, Math.random)
    expect(out).toHaveLength(3)
    expect(new Set(out.map((w) => w.id)).size).toBe(3)
  })
  it('returns all words when count exceeds length', () => {
    expect(pickWords(words, states({}), 10, 0, Math.random)).toHaveLength(5)
  })
  it('prefers low-level words', () => {
    const st = states({ run: 3, fine: 3, charge: 3, draw: 3, bank: 0 })
    let bankFirst = 0
    for (let i = 0; i < 200; i++) if (pickWords(words, st, 1, 0, Math.random)[0].id === 'bank') bankFirst++
    expect(bankFirst).toBeGreaterThan(80)
  })
})

describe('buildBlankQuestion', () => {
  it('builds 4 options including the answer and accepts inflected form', () => {
    const q = buildBlankQuestion(words[0], 0, words, Math.random)
    expect(q.kind).toBe('blank')
    expect(q.options).toHaveLength(4)
    expect(q.options).toContain('run')
    expect(new Set(q.options).size).toBe(4)
    expect(q.prompt).toBe('I ____ it.')
    expect(q.accept).toEqual(['run', 'run0'])
    expect(q.explain).toBe('run meaning 0')
  })
  it('uses fewer options when the pool is small', () => {
    const q = buildBlankQuestion(words[0], 0, words.slice(0, 2), Math.random)
    expect(q.options.sort()).toEqual(['fine', 'run'])
  })
})

describe('buildPickQuestion', () => {
  it('uses the same word\'s other senses first', () => {
    const q = buildPickQuestion(words[0], 1, words, Math.random)
    expect(q.answer).toBe('운영하다')
    expect(q.options.sort()).toEqual(['달리다', '운영하다', '작동하다', '흐르다'])
    expect(q.sentence).toBe('I run1 it.')
  })
  it('fills from other words when the word has few senses', () => {
    const q = buildPickQuestion(words[2], 0, words, Math.random)
    expect(q.options).toHaveLength(4)
    expect(q.options).toContain('청구하다')
  })
})

describe('buildRound', () => {
  it('makes ROUND_SIZE questions with distinct words, falling back to bank pool when range is small', () => {
    const range = words.slice(0, 2)
    const round = buildRound('blank', range, words, states({}), 0, Math.random)
    expect(round).toHaveLength(2)
    expect(round.every((q) => q.options.length === 4)).toBe(true)
    const ten = Array.from({ length: 12 }, (_, i) => mk(`w${i}`, i + 1, ['뜻']))
    const big = buildRound('pick', ten, ten, new Map(), 0, Math.random)
    expect(big).toHaveLength(10)
    expect(new Set(big.map((q) => q.wordId)).size).toBe(10)
  })
})
