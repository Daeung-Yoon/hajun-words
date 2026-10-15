import type { Word } from '../content/schema'
import type { BlankQuestion } from './picker'

export function normalizeKo(s: string): string {
  return s.replace(/\([^)]*\)/g, '').replace(/[\s.,;:!?'"·~\-_/]/g, '')
}

export function normalizeEn(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function gradeBlankInput(q: BlankQuestion, input: string): boolean {
  const n = normalizeEn(input)
  return n.length > 0 && q.accept.includes(n)
}

export interface MockWordResult { wordId: string; matched: number; total: number; missed: string[] }

export function gradeMockWord(word: Word, answers: string[]): MockWordResult {
  const given = new Set(answers.map(normalizeKo).filter(Boolean))
  const missed = word.senses.filter((s) => !given.has(normalizeKo(s.ko))).map((s) => s.ko)
  return { wordId: word.id, matched: word.senses.length - missed.length, total: word.senses.length, missed }
}

export function gradeMockExam(words: Word[], answers: Record<string, string[]>) {
  const results = words.map((w) => gradeMockWord(w, answers[w.id] ?? []))
  const sum = results.reduce((s, r) => s + r.matched / r.total, 0)
  const score = words.length ? Math.round((sum / words.length) * 100) : 0
  return { score, results }
}
