import { describe, it, expect, beforeEach } from 'vitest'
import { resetProgress } from './progress'
import { createRange, listRanges, getCurrentRange, setCurrentRange, setAcademyScore, updateMockBest, getSetting, setSetting } from './ranges'

beforeEach(async () => { await resetProgress() })

describe('ranges', () => {
  it('creates a range and makes it current', async () => {
    const id = await createRange({ bankId: 'b', from: 1, to: 10, name: 'r1' }, 1000)
    const cur = await getCurrentRange()
    expect(cur?.id).toBe(id)
    expect(cur?.mockBest).toBeNull()
  })
  it('lists newest first and switches current', async () => {
    const a = await createRange({ bankId: 'b', from: 1, to: 5, name: 'a' }, 1000)
    const b = await createRange({ bankId: 'b', from: 6, to: 10, name: 'b' }, 2000)
    expect((await listRanges()).map((r) => r.name)).toEqual(['b', 'a'])
    await setCurrentRange(a)
    expect((await getCurrentRange())?.id).toBe(a)
    expect(b).not.toBe(a)
  })
  it('stores academy score and keeps the best mock score', async () => {
    const id = await createRange({ bankId: 'b', from: 1, to: 5, name: 'a' })
    await setAcademyScore(id, 90)
    await updateMockBest(id, 70)
    await updateMockBest(id, 60)
    const r = (await listRanges())[0]
    expect(r.academyScore).toBe(90)
    expect(r.mockBest).toBe(70)
  })
  it('reads settings with fallback', async () => {
    expect(await getSetting('inputMode', 'choice')).toBe('choice')
    await setSetting('inputMode', 'typing')
    expect(await getSetting('inputMode', 'choice')).toBe('typing')
  })
})
