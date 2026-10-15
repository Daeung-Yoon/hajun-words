import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { Word } from '../content/schema'
import { canListen, describeListenError, listen, tidyHeard } from '../speech/stt'

interface Props {
  words: Word[]
  onSubmit: (answers: Record<string, string[]>) => void
  submitting?: boolean
}

export default function MockForm({ words, onSubmit, submitting = false }: Props) {
  const [answers, setAnswers] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(words.map((w) => [w.id, w.senses.map(() => '')])))
  const [listening, setListening] = useState<string | null>(null)
  const [micError, setMicError] = useState<{ key: string; text: string; trace?: string } | null>(null)
  const stopRef = useRef<() => void>(() => {})
  const mic = canListen()

  useEffect(() => () => stopRef.current(), [])

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
  const hear = (id: string, i: number) => {
    const key = `${id}/${i}`
    stopRef.current()
    if (listening === key) { setListening(null); return }
    setListening(key)
    setMicError(null)
    stopRef.current = listen('ko-KR', (text) => set(id, i, tidyHeard(text)), (error, trace) => {
      stopRef.current = () => {}
      setListening(null)
      const text = error ? describeListenError(error) : ''
      setMicError(text ? { key, text, trace } : null)
    })
  }
  const lastId = words[words.length - 1]?.id
  return (
    <form onSubmit={submit} className="stack">
      {words.map((w, n) => (
        <div className="card stack" key={w.id}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong style={{ fontSize: '1.2rem' }}>{n + 1}. {w.word}</strong><span className="muted">{w.pos}</span>
          </div>
          {w.senses.map((_, i) => {
            const key = `${w.id}/${i}`
            const on = listening === key
            return (
              <div className="row" key={i}>
                <input className="input" style={{ flex: 1 }} aria-label={`${w.word} 뜻 ${i + 1}`} placeholder={on ? '"정답 곰"처럼 말해요…' : `뜻 ${i + 1}`}
                  enterKeyHint={w.id === lastId && i === w.senses.length - 1 ? 'done' : 'next'}
                  value={answers[w.id][i]} onChange={(e) => set(w.id, i, e.target.value)} onKeyDown={nextOnEnter} />
                {mic && (
                  <button type="button" className={`btn ${on ? 'btn-primary' : ''}`} aria-label={`${w.word} 뜻 ${i + 1} 말하기`} aria-pressed={on}
                    onClick={() => hear(w.id, i)}>🎤</button>
                )}
                {micError?.key === key && (
                  <div style={{ flexBasis: '100%' }}>
                    <div className="danger" style={{ fontSize: '.9rem' }}>{micError.text}</div>
                    {micError.trace && <div className="muted" style={{ fontSize: '.75rem', wordBreak: 'break-all' }}>진단: {micError.trace}</div>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
      <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>채점하기</button>
    </form>
  )
}
