import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useApp } from '../app/AppContext'
import { buildRound, type Question } from '../study/picker'
import type { WordState } from '../study/level'
import { getStates, recordAnswer, recordSession } from '../store/progress'
import { getSetting } from '../store/ranges'
import QuizRound from './QuizRound'

const TITLE = { blank: '예문 빈칸', pick: '뜻 고르기' } as const

export default function QuizScreen({ mode }: { mode: 'blank' | 'pick' }) {
  const { bank, range, rangeWords } = useApp()
  const [questions, setQuestions] = useState<Question[] | null>(null)
  const [before, setBefore] = useState<Map<string, WordState>>(new Map())
  const [inputMode, setInputMode] = useState<'choice' | 'typing'>('choice')
  const [result, setResult] = useState<{ correct: number; total: number; up: string[] } | null>(null)
  const [key, setKey] = useState(0)
  const finishing = useRef(false)

  const start = useCallback(async () => {
    if (!bank) return
    const states = await getStates(rangeWords.map((w) => w.id))
    setBefore(states)
    setInputMode(await getSetting<'choice' | 'typing'>('blankInputMode', 'choice'))
    setQuestions(buildRound(mode, rangeWords, bank.words, states, Date.now(), Math.random))
    setResult(null)
    setKey((k) => k + 1)
  }, [bank, rangeWords, mode])

  useEffect(() => { void start() }, [start])

  const onFinish = async (correct: number) => {
    if (!questions || !range || finishing.current) return
    finishing.current = true
    try {
      await recordSession({ mode, rangeId: range.id!, at: Date.now(), correct, total: questions.length })
      const after = await getStates(questions.map((q) => q.wordId))
      const up = [...after.values()].filter((s) => s.level > (before.get(s.id)?.level ?? 0)).map((s) => s.id)
      setResult({ correct, total: questions.length, up })
    } finally {
      finishing.current = false
    }
  }

  if (!questions) return <main className="page"><p className="muted">문제를 만드는 중…</p></main>
  if (questions.length === 0) return <main className="page"><p className="muted">범위에 단어가 없어요.</p><Link to="/" className="btn">홈으로</Link></main>

  return (
    <main className="page stack">
      <div className="topbar"><Link to="/">← 홈</Link><span>{TITLE[mode]}</span><span /></div>
      {result ? (
        <div className="card stack center">
          <div className="big">{result.correct} / {result.total}</div>
          {result.up.length > 0 && <div>레벨 업 ⬆ {result.up.join(', ')}</div>}
          <button className="btn btn-primary btn-block" onClick={start}>한 번 더</button>
          <Link to="/" className="btn btn-block">홈으로</Link>
        </div>
      ) : (
        <QuizRound key={key} questions={questions} inputMode={mode === 'blank' ? inputMode : 'choice'}
          onAnswer={(q, ok) => { void recordAnswer(q.wordId, ok, mode) }} onFinish={onFinish} />
      )}
    </main>
  )
}
