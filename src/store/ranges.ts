import { db, type RangeRecord } from './db'

const CURRENT_KEY = 'currentRangeId'

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key)
  return row ? (row.value as T) : fallback
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value })
}

export async function createRange(input: { bankId: string; from: number; to: number; name: string }, now = Date.now()): Promise<number> {
  const id = (await db.ranges.add({ ...input, createdAt: now, mockBest: null, academyScore: null })) as number
  await setSetting(CURRENT_KEY, id)
  return id
}

export async function listRanges(): Promise<RangeRecord[]> {
  return db.ranges.orderBy('createdAt').reverse().toArray()
}

export async function getCurrentRange(): Promise<RangeRecord | null> {
  const id = await getSetting<number | null>(CURRENT_KEY, null)
  if (id === null) return null
  return (await db.ranges.get(id)) ?? null
}

export async function setCurrentRange(id: number): Promise<void> {
  await setSetting(CURRENT_KEY, id)
}

export async function setAcademyScore(id: number, score: number | null): Promise<void> {
  await db.ranges.update(id, { academyScore: score })
}

export async function updateMockBest(id: number, score: number): Promise<void> {
  const r = await db.ranges.get(id)
  if (!r) return
  if (r.mockBest === null || score > r.mockBest) await db.ranges.update(id, { mockBest: score })
}

/** 같은 뱅크·구간의 범위가 이미 있으면 그걸 현재 범위로 쓰고, 없으면 새로 만든다. */
export async function selectRange(input: { bankId: string; from: number; to: number; name: string }): Promise<number> {
  const existing = await db.ranges.filter((r) => r.bankId === input.bankId && r.from === input.from && r.to === input.to).first()
  if (existing?.id !== undefined) {
    await setCurrentRange(existing.id)
    return existing.id
  }
  return createRange(input)
}
