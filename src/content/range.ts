import type { Bank, Word } from './schema'

export interface DayGroup { label: string; from: number; to: number }

const firstLabel = (source: string) => source.split(',')[0].trim()

export function daysOf(bank: Bank): DayGroup[] {
  const groups: DayGroup[] = []
  for (const w of [...bank.words].sort((a, b) => a.no - b.no)) {
    const label = firstLabel(w.source) || '기타'
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.to = w.no
    else groups.push({ label, from: w.no, to: w.no })
  }
  return groups
}

export function wordsInRange(bank: Bank, from: number, to: number): Word[] {
  return bank.words.filter((w) => w.no >= from && w.no <= to).sort((a, b) => a.no - b.no)
}

export function rangeName(bank: Bank, from: number, to: number, date: Date): string {
  const prefix = `${date.getMonth() + 1}/${date.getDate()}`
  const days = daysOf(bank)
  const first = days.find((d) => d.from === from)
  const last = days.find((d) => d.to === to)
  if (first && last) {
    const a = first.label, b = last.label
    return a === b ? `${prefix} ${a}` : `${prefix} ${a}~${b.replace(/^Day\s*/i, '')}`
  }
  return from === to ? `${prefix} 단어 ${from}` : `${prefix} 단어 ${from}~${to}`
}
