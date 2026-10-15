import { describe, it, expect } from 'vitest'
import { validateBank } from './validate'

const word = (id: string, no: number, extra: Partial<Record<string, unknown>> = {}) => ({
  id, no, source: 'Day 1', word: id, pos: 'v.', ipa: '',
  core: { ko: '핵심', en: 'core' },
  senses: [{ ko: '뜻', en: 'meaning', bridge: '', example: `I ${id} now.`, blank: 'I ____ now.' }],
  ...extra,
})
const bank = (words: unknown[]) => ({ id: 'b', title: 'B', words })

describe('validateBank', () => {
  it('accepts a valid bank', () => {
    expect(validateBank(bank([word('run', 1), word('fine', 2)]))).toEqual([])
  })
  it('reports schema errors', () => {
    const errors = validateBank(bank([word('run', 1, { senses: [] })]))
    expect(errors.some((e) => e.includes('senses'))).toBe(true)
  })
  it('reports duplicate ids', () => {
    expect(validateBank(bank([word('run', 1), word('run', 2)]))).toContain('중복 id: run')
  })
  it('reports non-consecutive numbers', () => {
    expect(validateBank(bank([word('run', 1), word('fine', 3)]))).toContain('번호가 연속이 아님: 1 다음이 3 (fine)')
  })
  it('reports a blank that does not match its example', () => {
    const w = word('run', 1)
    w.senses[0].blank = 'You ____ now.'
    expect(validateBank(bank([w]))).toContain('빈칸이 예문과 맞지 않음: run #1')
  })
})
