import { BankSchema } from './schema'
import { blankAnswer } from './blank'

export function validateBank(data: unknown): string[] {
  const parsed = BankSchema.safeParse(data)
  if (!parsed.success) {
    return parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
  }
  const errors: string[] = []
  const seen = new Set<string>()
  const sorted = [...parsed.data.words].sort((a, b) => a.no - b.no)
  let prev = 0
  for (const w of sorted) {
    if (seen.has(w.id)) errors.push(`중복 id: ${w.id}`)
    seen.add(w.id)
    if (w.no !== prev + 1) errors.push(`번호가 연속이 아님: ${prev} 다음이 ${w.no} (${w.id})`)
    prev = w.no
    w.senses.forEach((s, idx) => {
      if (blankAnswer(s) === '') errors.push(`빈칸이 예문과 맞지 않음: ${w.id} #${idx + 1}`)
    })
  }
  return errors
}
