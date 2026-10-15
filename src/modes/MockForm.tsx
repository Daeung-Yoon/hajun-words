import { useState, type FormEvent, type KeyboardEvent } from 'react'
import type { Word } from '../content/schema'

interface Props {
  words: Word[]
  onSubmit: (answers: Record<string, string[]>) => void
}

export default function MockForm({ words, onSubmit }: Props) {
  const [answers, setAnswers] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(words.map((w) => [w.id, w.senses.map(() => '')])))
  const set = (id: string, i: number, v: string) =>
    setAnswers((a) => ({ ...a, [id]: a[id].map((x, j) => (j === i ? v : x)) }))
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const empty = Object.values(answers).flat().filter((x) => x.trim() === '').length
    if (empty > 0 && !window.confirm(`빈칸이 ${empty}개 있어요. 그래도 채점할까요?`)) return
    onSubmit(answers)
  }
  const nextOnEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (e.nativeEvent.isComposing) return
    const inputs = Array.from(e.currentTarget.form?.querySelectorAll('input') ?? [])
    inputs[inputs.indexOf(e.currentTarget) + 1]?.focus()
  }
  const lastId = words[words.length - 1]?.id
  return (
    <form onSubmit={submit} className="stack">
      {words.map((w, n) => (
        <div className="card stack" key={w.id}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong style={{ fontSize: '1.2rem' }}>{n + 1}. {w.word}</strong><span className="muted">{w.pos}</span>
          </div>
          {w.senses.map((_, i) => (
            <input key={i} className="input" aria-label={`${w.word} 뜻 ${i + 1}`} placeholder={`뜻 ${i + 1}`}
              enterKeyHint={w.id === lastId && i === w.senses.length - 1 ? 'done' : 'next'}
              value={answers[w.id][i]} onChange={(e) => set(w.id, i, e.target.value)} onKeyDown={nextOnEnter} />
          ))}
        </div>
      ))}
      <button type="submit" className="btn btn-primary btn-block">채점하기</button>
    </form>
  )
}
