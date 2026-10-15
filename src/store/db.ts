import Dexie, { type EntityTable } from 'dexie'
import type { WordState, GradedMode } from '../study/level'

export interface RangeRecord {
  id?: number; name: string; bankId: string; from: number; to: number
  createdAt: number; mockBest: number | null; academyScore: number | null
}
export interface SessionRecord { id?: number; mode: GradedMode; rangeId: number; at: number; correct: number; total: number }
export interface SentenceRecord { id?: number; wordId: string; senseIndex: number; text: string; at: number }
export interface BadgeRecord { id: string; at: number }
export interface SettingRecord { key: string; value: unknown }

export const db = new Dexie('hajun-words') as Dexie & {
  wordState: EntityTable<WordState, 'id'>
  mySentences: EntityTable<SentenceRecord, 'id'>
  ranges: EntityTable<RangeRecord, 'id'>
  sessions: EntityTable<SessionRecord, 'id'>
  badges: EntityTable<BadgeRecord, 'id'>
  settings: EntityTable<SettingRecord, 'key'>
}

db.version(1).stores({
  wordState: 'id',
  mySentences: '++id, wordId',
  ranges: '++id, createdAt',
  sessions: '++id, at, rangeId',
  badges: 'id',
  settings: 'key',
})

export const ALL_TABLES = [db.wordState, db.mySentences, db.ranges, db.sessions, db.badges, db.settings] as const

export function dayKey(ts: number): string {
  const d = new Date(ts)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}
