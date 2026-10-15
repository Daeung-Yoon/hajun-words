import { useState, type FormEvent } from 'react'
import type { Word } from '../content/schema'

export default function MockForm({ words, onSubmit }: { words: Word[]; onSubmit: (answers: Record<string, string[]>) => void }) {
  const [answers, setAnswers] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(words.map((w) => [w.id, w.senses.map(() => '')])))
  const set = (id: string, i: number, v: string) =>
    setAnswers((a) => ({ ...a, [id]: a[id].map((x, j) => (j === i ? v : x)) }))
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit(answers) }
  return (
    <form onSubmit={submit} className="stack">
      {words.map((w, n) => (
        <div className="card stack" key={w.id}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong style={{ fontSize: '1.2rem' }}>{n + 1}. {w.word}</strong><span className="muted">{w.pos}</span>
          </div>
          {w.senses.map((_, i) => (
            <input key={i} className="input" aria-label={`${w.word} 뜻 ${i + 1}`} placeholder={`뜻 ${i + 1}`}
              value={answers[w.id][i]} onChange={(e) => set(w.id, i, e.target.value)} />
          ))}
        </div>
      ))}
      <button type="submit" className="btn btn-primary btn-block">채점하기</button>
    </form>
  )
}
