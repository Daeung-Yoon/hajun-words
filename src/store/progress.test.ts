import { describe, it, expect, beforeEach } from 'vitest'
import { db, dayKey } from './db'
import { getStates, recordView, recordAnswer, recordSession, getStreak, getTodayCount, resetProgress } from './progress'

const DAY = 24 * 60 * 60 * 1000
// 2024-01-10 12:00 로컬 정오. 자정 경계 문제를 피한다.
const NOON = new Date(2024, 0, 10, 12, 0, 0).getTime()
const session = (at: number, total = 10) => ({ mode: 'blank' as const, rangeId: 1, at, correct: 5, total })

beforeEach(async () => { await resetProgress() })

describe('dayKey', () => {
  it('formats local date', () => {
    expect(dayKey(NOON)).toBe('2024-01-10')
  })
})

describe('states', () => {
  it('fills missing ids with initial state', async () => {
    const m = await getStates(['run', 'fine'])
    expect(m.get('run')?.level).toBe(0)
    expect(m.size).toBe(2)
  })
  it('persists views and answers', async () => {
    await recordView('run', NOON)
    const s = await recordAnswer('run', true, 'blank', NOON + 1)
    expect(s.streak).toBe(1)
    const m = await getStates(['run'])
    expect(m.get('run')).toEqual(s)
    expect(m.get('run')?.level).toBe(1)
  })
})

describe('streak', () => {
  it('is 0 with no sessions', async () => {
    expect(await getStreak(NOON)).toBe(0)
  })
  it('counts consecutive days ending today', async () => {
    await recordSession(session(NOON - 2 * DAY))
    await recordSession(session(NOON - DAY))
    await recordSession(session(NOON))
    expect(await getStreak(NOON)).toBe(3)
  })
  it('keeps the streak when yesterday was studied but today not yet', async () => {
    await recordSession(session(NOON - 2 * DAY))
    await recordSession(session(NOON - DAY))
    expect(await getStreak(NOON)).toBe(2)
  })
  it('resets after a skipped day', async () => {
    await recordSession(session(NOON - 3 * DAY))
    await recordSession(session(NOON - 2 * DAY))
    expect(await getStreak(NOON)).toBe(0)
  })
})

describe('today count', () => {
  it('sums totals of sessions today only', async () => {
    await recordSession(session(NOON - DAY, 10))
    await recordSession(session(NOON - 60_000, 10))
    await recordSession(session(NOON, 7))
    expect(await getTodayCount(NOON)).toBe(17)
  })
})

describe('reset', () => {
  it('clears everything', async () => {
    await recordView('run', NOON)
    await db.ranges.add({ name: 'r', bankId: 'b', from: 1, to: 2, createdAt: NOON, mockBest: null, academyScore: null })
    await resetProgress()
    expect(await db.wordState.count()).toBe(0)
    expect(await db.ranges.count()).toBe(0)
  })
})
