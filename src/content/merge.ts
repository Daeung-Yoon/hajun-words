import type { Bank, NewWord, Word } from './schema'

export function mergeWords(bank: Bank | null, meta: { id: string; title: string }, newWords: NewWord[]): Bank {
  const words: Word[] = bank ? bank.words.map((w) => ({ ...w })) : []
  const byId = new Map(words.map((w) => [w.id, w]))
  let next = words.reduce((m, w) => Math.max(m, w.no), 0) + 1
  for (const nw of newWords) {
    const existing = byId.get(nw.id)
    if (existing) {
      const labels = existing.source.split(',').map((s) => s.trim()).filter(Boolean)
      const label = nw.source.trim()
      if (label && !labels.includes(label)) existing.source = [...labels, label].join(', ')
      continue
    }
    const w: Word = { ...nw, no: next++ }
    words.push(w)
    byId.set(w.id, w)
  }
  return { id: meta.id, title: bank?.title ?? meta.title, words }
}
