export type GradedMode = 'blank' | 'pick' | 'match' | 'mock'
export type Mode = 'tree' | 'sentence' | GradedMode
export type Level = 0 | 1 | 2 | 3

export interface WordState {
  id: string
  level: Level
  streak: number
  lastStudiedAt: number | null
  stats: Partial<Record<GradedMode, { correct: number; wrong: number }>>
}

export const STALE_MS = 7 * 24 * 60 * 60 * 1000
const LEVEL_WEIGHT: Record<Level, number> = { 0: 4, 1: 3, 2: 2, 3: 1 }

export function initialState(id: string): WordState {
  return { id, level: 0, streak: 0, lastStudiedAt: null, stats: {} }
}

export function applyView(s: WordState, now: number): WordState {
  return { ...s, level: s.level < 1 ? 1 : s.level, lastStudiedAt: now }
}

export function applyAnswer(s: WordState, correct: boolean, mode: GradedMode, now: number): WordState {
  const prev = s.stats[mode] ?? { correct: 0, wrong: 0 }
  const stats = { ...s.stats, [mode]: { correct: prev.correct + (correct ? 1 : 0), wrong: prev.wrong + (correct ? 0 : 1) } }
  if (correct) {
    const streak = s.streak + 1
    if (streak >= 2) {
      return { ...s, level: Math.min(3, s.level + 1) as Level, streak: 0, lastStudiedAt: now, stats }
    }
    return { ...s, streak, lastStudiedAt: now, stats }
  }
  return { ...s, level: s.level === 0 ? 0 : 1, streak: 0, lastStudiedAt: now, stats }
}

export function isStale(s: WordState, now: number): boolean {
  return s.lastStudiedAt !== null && now - s.lastStudiedAt >= STALE_MS
}

export function weight(s: WordState, now: number): number {
  return LEVEL_WEIGHT[s.level] + (isStale(s, now) ? 2 : 0)
}
