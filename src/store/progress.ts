import { db, dayKey, ALL_TABLES, type SessionRecord } from './db'
import { applyAnswer, applyView, initialState, type GradedMode, type WordState } from '../study/level'

const DAY = 24 * 60 * 60 * 1000

export async function getStates(ids: string[]): Promise<Map<string, WordState>> {
  const rows = await db.wordState.bulkGet(ids)
  return new Map(ids.map((id, i) => [id, rows[i] ?? initialState(id)]))
}

export async function recordView(id: string, now = Date.now()): Promise<void> {
  const cur = (await db.wordState.get(id)) ?? initialState(id)
  await db.wordState.put(applyView(cur, now))
}

export async function recordAnswer(id: string, correct: boolean, mode: GradedMode, now = Date.now()): Promise<WordState> {
  const cur = (await db.wordState.get(id)) ?? initialState(id)
  const next = applyAnswer(cur, correct, mode, now)
  await db.wordState.put(next)
  return next
}

export async function recordSession(s: Omit<SessionRecord, 'id'>): Promise<void> {
  await db.sessions.add(s as SessionRecord)
}

export async function getStreak(now = Date.now()): Promise<number> {
  const days = new Set((await db.sessions.toArray()).map((s) => dayKey(s.at)))
  let cursor = now
  if (!days.has(dayKey(cursor))) {
    cursor -= DAY
    if (!days.has(dayKey(cursor))) return 0
  }
  let streak = 0
  while (days.has(dayKey(cursor))) { streak++; cursor -= DAY }
  return streak
}

export async function getTodayCount(now = Date.now()): Promise<number> {
  const today = dayKey(now)
  const rows = await db.sessions.where('at').above(now - 2 * DAY).toArray()
  return rows.filter((s) => dayKey(s.at) === today).reduce((n, s) => n + s.total, 0)
}

export async function resetProgress(): Promise<void> {
  await db.transaction('rw', [...ALL_TABLES], async () => {
    for (const t of ALL_TABLES) await t.clear()
  })
}
