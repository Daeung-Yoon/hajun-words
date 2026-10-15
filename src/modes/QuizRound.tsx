import { useState, type FormEvent } from 'react'
import type { Question } from '../study/picker'
import { gradeBlankInput } from '../study/grading'

interface Props {
  questions: Question[]
  inputMode: 'choice' | 'typing'
  onAnswer: (q: Question, correct: boolean) => void
  onFinish: (correct: number) => void
}

export default function QuizRound({ questions, inputMode, onAnswer, onFinish }: Props) {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [typed, setTyped] = useState('')
  const q = questions[i]
  const answered = picked !== null
  const isCorrect = answered && (q.kind === 'blank' && inputMode === 'typing' ? gradeBlankInput(q, picked) : picked === q.answer)
  const last = i === questions.length - 1

  const answer = (value: string) => {
    if (answered) return
    const ok = q.kind === 'blank' && inputMode === 'typing' ? gradeBlankInput(q, value) : value === q.answer
    setPicked(value)
    if (ok) setCorrectCount((c) => c + 1)
    onAnswer(q, ok)
  }
  const next = () => {
    if (last) { onFinish(correctCount); return }
    setI(i + 1); setPicked(null); setTyped('')
  }
  const submitTyped = (e: FormEvent) => { e.preventDefault(); if (typed.trim()) answer(typed) }

  return (
    <div className="stack">
      <div className="muted">{i + 1} / {questions.length}</div>
      <div className="card">
        {q.kind === 'blank' ? <p style={{ fontSize: '1.2rem', margin: 0 }}>{q.prompt}</p>
          : <><p style={{ fontSize: '1.2rem', margin: 0 }}>{q.sentence}</p><p className="muted" style={{ margin: '6px 0 0' }}>이 문장에서 쓰인 뜻은?</p></>}
      </div>
      {q.kind === 'blank' && inputMode === 'typing' ? (
        <form onSubmit={submitTyped} className="row">
          <input className="input" aria-label="답 입력" autoFocus autoCapitalize="none" autoCorrect="off" value={typed}
            disabled={answered} onChange={(e) => setTyped(e.target.value)} />
          <button className="btn btn-primary" type="submit" disabled={answered}>확인</button>
        </form>
      ) : (
        <div className="stack">
          {q.options.map((o) => {
            const cls = answered ? (o === q.answer ? ' correct' : o === picked ? ' wrong' : '') : ''
            return <button key={o} className={`btn btn-block option${cls}`} disabled={answered} onClick={() => answer(o)}>{o}</button>
          })}
        </div>
      )}
      {answered && (
        <div className={`card ${isCorrect ? '' : 'danger'}`}>
          <strong>{isCorrect ? '맞았어요!' : `정답: ${q.answer}`}</strong>
          <div className="muted">{q.explain}</div>
        </div>
      )}
      {answered && <button className="btn btn-primary btn-block" onClick={next}>{last ? '결과 보기' : '다음'}</button>}
    </div>
  )
}
