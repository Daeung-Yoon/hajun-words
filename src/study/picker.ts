import type { Word } from '../content/schema'
import { blankAnswer } from '../content/blank'
import { weight, type WordState, initialState } from './level'

export type Rng = () => number
export const ROUND_SIZE = 10
const OPTION_COUNT = 4

export interface BlankQuestion {
  kind: 'blank'; wordId: string; senseIndex: number
  prompt: string; answer: string; accept: string[]; options: string[]; explain: string
}
export interface PickQuestion {
  kind: 'pick'; wordId: string; senseIndex: number
  sentence: string; answer: string; options: string[]; explain: string
}
export type Question = BlankQuestion | PickQuestion

export function shuffle<T>(arr: T[], rng: Rng): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function pickWords(words: Word[], states: Map<string, WordState>, count: number, now: number, rng: Rng): Word[] {
  const remaining = words.map((w) => ({ w, wt: weight(states.get(w.id) ?? initialState(w.id), now) }))
  const out: Word[] = []
  while (out.length < count && remaining.length) {
    const total = remaining.reduce((s, r) => s + r.wt, 0)
    let r = rng() * total
    let idx = remaining.length - 1
    for (let i = 0; i < remaining.length; i++) {
      r -= remaining[i].wt
      if (r < 0) { idx = i; break }
    }
    out.push(remaining[idx].w)
    remaining.splice(idx, 1)
  }
  return out
}

export function chooseSenseIndex(word: Word, rng: Rng): number {
  return Math.floor(rng() * word.senses.length)
}

function takeDistinct(candidates: string[], exclude: Set<string>, n: number, rng: Rng): string[] {
  const uniq = [...new Set(candidates)].filter((c) => !exclude.has(c))
  return shuffle(uniq, rng).slice(0, n)
}

export function buildBlankQuestion(word: Word, senseIndex: number, pool: Word[], rng: Rng): BlankQuestion {
  const sense = word.senses[senseIndex]
  const distractors = takeDistinct(pool.filter((w) => w.id !== word.id).map((w) => w.word), new Set([word.word]), OPTION_COUNT - 1, rng)
  const accept = [...new Set([word.word.toLowerCase(), blankAnswer(sense).toLowerCase()].filter(Boolean))]
  return {
    kind: 'blank', wordId: word.id, senseIndex, prompt: sense.blank, answer: word.word, accept,
    options: shuffle([word.word, ...distractors], rng), explain: sense.en,
  }
}

export function buildPickQuestion(word: Word, senseIndex: number, pool: Word[], rng: Rng): PickQuestion {
  const sense = word.senses[senseIndex]
  const own = takeDistinct(word.senses.filter((_, i) => i !== senseIndex).map((s) => s.ko), new Set([sense.ko]), OPTION_COUNT - 1, rng)
  const others = pool.filter((w) => w.id !== word.id).flatMap((w) => w.senses.map((s) => s.ko))
  const fill = takeDistinct(others, new Set([sense.ko, ...own]), OPTION_COUNT - 1 - own.length, rng)
  return {
    kind: 'pick', wordId: word.id, senseIndex, sentence: sense.example, answer: sense.ko,
    options: shuffle([sense.ko, ...own, ...fill], rng), explain: sense.en,
  }
}

export function buildRound(kind: 'blank' | 'pick', rangeWords: Word[], bankWords: Word[],
  states: Map<string, WordState>, now: number, rng: Rng): Question[] {
  const pool = rangeWords.length >= OPTION_COUNT ? rangeWords : bankWords
  return pickWords(rangeWords, states, ROUND_SIZE, now, rng).map((w) => {
    const si = chooseSenseIndex(w, rng)
    return kind === 'blank' ? buildBlankQuestion(w, si, pool, rng) : buildPickQuestion(w, si, pool, rng)
  })
}
