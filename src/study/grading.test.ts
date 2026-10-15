import { describe, it, expect } from 'vitest'
import { normalizeKo, normalizeEn, gradeBlankInput, gradeMockWord, gradeMockExam } from './grading'
import type { Word } from '../content/schema'
import type { BlankQuestion } from './picker'

const mk = (id: string, kos: string[]): Word => ({
  id, no: 1, source: '', word: id, pos: '', ipa: '', core: { ko: '', en: '' },
  senses: kos.map((ko) => ({ ko, en: 'e', bridge: '', example: `a ${id} b`, blank: 'a ____ b' })),
  koGenerated: false, image: null, etymology: null,
})

describe('normalizeKo', () => {
  it('strips parentheses, spaces and punctuation', () => {
    expect(normalizeKo('(가게를) 운영하다')).toBe('운영하다')
    expect(normalizeKo('  달리다. ')).toBe('달리다')
    expect(normalizeKo('요금을 청구하다')).toBe('요금을청구하다')
    expect(normalizeKo('')).toBe('')
  })
})

describe('normalizeEn', () => {
  it('lowercases and trims', () => {
    expect(normalizeEn('  Runs ')).toBe('runs')
  })
})

describe('gradeBlankInput', () => {
  const q: BlankQuestion = { kind: 'blank', wordId: 'run', senseIndex: 0, prompt: '', answer: 'run',
    accept: ['run', 'runs'], options: [], explain: '' }
  it('accepts base or inflected form, case-insensitive', () => {
    expect(gradeBlankInput(q, 'Run')).toBe(true)
    expect(gradeBlankInput(q, ' runs')).toBe(true)
    expect(gradeBlankInput(q, 'ran')).toBe(false)
    expect(gradeBlankInput(q, '')).toBe(false)
  })
})

describe('gradeMockWord', () => {
  const run = mk('run', ['달리다', '(가게를) 운영하다', '흐르다'])
  it('counts matches regardless of order and reports missed meanings', () => {
    const r = gradeMockWord(run, ['흐르다', '운영하다', ''])
    expect(r).toEqual({ wordId: 'run', matched: 2, total: 3, missed: ['달리다'] })
  })
  it('does not count the same meaning twice', () => {
    expect(gradeMockWord(run, ['달리다', '달리다', '달리다']).matched).toBe(1)
  })
})

describe('gradeMockExam', () => {
  it('scores 100 when everything matches and rounds otherwise', () => {
    const words = [mk('run', ['달리다', '흐르다']), mk('bank', ['은행'])]
    expect(gradeMockExam(words, { run: ['달리다', '흐르다'], bank: ['은행'] }).score).toBe(100)
    const half = gradeMockExam(words, { run: ['달리다'], bank: [] })
    expect(half.score).toBe(25)
    expect(half.results[1].missed).toEqual(['은행'])
  })
  it('treats missing answers as empty', () => {
    expect(gradeMockExam([mk('bank', ['은행'])], {}).score).toBe(0)
  })
})
