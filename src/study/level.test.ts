import { describe, it, expect } from 'vitest'
import { initialState, applyView, applyAnswer, isStale, weight, STALE_MS } from './level'

const T = 1_700_000_000_000

describe('level', () => {
  it('starts at level 0 with no history', () => {
    expect(initialState('run')).toEqual({ id: 'run', level: 0, streak: 0, lastStudiedAt: null, stats: {} })
  })
  it('viewing raises level to at least 1 and stamps time', () => {
    const s = applyView(initialState('run'), T)
    expect(s.level).toBe(1)
    expect(s.lastStudiedAt).toBe(T)
    const s3 = applyView({ ...s, level: 3 }, T + 1)
    expect(s3.level).toBe(3)
  })
  it('two correct answers in a row raise the level by one and reset streak', () => {
    let s = initialState('run')
    s = applyAnswer(s, true, 'blank', T)
    expect(s.level).toBe(0)
    expect(s.streak).toBe(1)
    s = applyAnswer(s, true, 'blank', T + 1)
    expect(s.level).toBe(1)
    expect(s.streak).toBe(0)
    expect(s.stats.blank).toEqual({ correct: 2, wrong: 0 })
  })
  it('level never exceeds 3', () => {
    let s = { ...initialState('run'), level: 3 as const, streak: 1 }
    s = applyAnswer(s, true, 'pick', T)
    expect(s.level).toBe(3)
  })
  it('a wrong answer drops to level 1, or stays 0', () => {
    const high = applyAnswer({ ...initialState('run'), level: 3, streak: 1 }, false, 'mock', T)
    expect(high.level).toBe(1)
    expect(high.streak).toBe(0)
    expect(high.stats.mock).toEqual({ correct: 0, wrong: 1 })
    const zero = applyAnswer(initialState('run'), false, 'mock', T)
    expect(zero.level).toBe(0)
  })
  it('is stale after 7 days without study, never stale if never studied', () => {
    const s = applyView(initialState('run'), T)
    expect(isStale(s, T + STALE_MS - 1)).toBe(false)
    expect(isStale(s, T + STALE_MS)).toBe(true)
    expect(isStale(initialState('run'), T)).toBe(false)
  })
  it('weights by level and adds 2 when stale', () => {
    const base = { ...initialState('run'), lastStudiedAt: T }
    expect(weight({ ...base, level: 0 }, T)).toBe(4)
    expect(weight({ ...base, level: 1 }, T)).toBe(3)
    expect(weight({ ...base, level: 2 }, T)).toBe(2)
    expect(weight({ ...base, level: 3 }, T)).toBe(1)
    expect(weight({ ...base, level: 3 }, T + STALE_MS)).toBe(3)
  })
})
