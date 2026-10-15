import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useApp } from '../app/AppContext'
import { gradeMockExam, type MockWordResult } from '../study/grading'
import { shuffle } from '../study/picker'
import { recordAnswer, recordSession } from '../store/progress'
import { updateMockBest } from '../store/ranges'
import MockForm from './MockForm'

export default function MockExam() {
  const { range, rangeWords } = useApp()
  const [order, setOrder] = useState<'number' | 'shuffle'>('number')
  const [started, setStarted] = useState(false)
  const [result, setResult] = useState<{ score: number; results: MockWordResult[] } | null>(null)
  const words = useMemo(() => (order === 'shuffle' ? shuffle(rangeWords, Math.random) : rangeWords), [rangeWords, order])
  const byId = useMemo(() => new Map(rangeWords.map((w) => [w.id, w])), [rangeWords])
  const busy = useRef(false)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (answers: Record<string, string[]>) => {
    if (busy.current) return
    busy.current = true
    setSubmitting(true)
    try {
      const r = gradeMockExam(words, answers)
      for (const w of r.results) await recordAnswer(w.wordId, w.matched === w.total, 'mock')
      if (range?.id !== undefined) {
        await recordSession({ mode: 'mock', rangeId: range.id, at: Date.now(), correct: r.results.filter((x) => x.matched === x.total).length, total: words.length })
        await updateMockBest(range.id, r.score)
      }
      setResult(r)
      window.scrollTo(0, 0)
    } finally {
      busy.current = false
      setSubmitting(false)
    }
  }

  if (rangeWords.length === 0) return <main className="page"><p className="muted">범위에 단어가 없어요.</p><Link to="/" className="btn">홈으로</Link></main>

  return (
    <main className="page stack">
      <div className="topbar"><Link to="/">← 홈</Link><span>학원 모의시험</span><span /></div>
      {!started && (
        <div className="card stack">
          <p>단어 {rangeWords.length}개, 뜻을 모두 써요. 순서는 상관없어요.</p>
          <div className="row">
            <button className={`btn ${order === 'number' ? 'btn-primary' : ''}`} onClick={() => setOrder('number')}>번호 순</button>
            <button className={`btn ${order === 'shuffle' ? 'btn-primary' : ''}`} onClick={() => setOrder('shuffle')}>섞기</button>
          </div>
          <button className="btn btn-primary btn-block" onClick={() => setStarted(true)}>시작</button>
        </div>
      )}
      {started && !result && <MockForm words={words} onSubmit={submit} submitting={submitting} />}
      {result && (
        <div className="stack">
          <div className="card center"><div className="big">{result.score}점</div><div className="muted">{range?.name}</div></div>
          {result.results.filter((r) => r.missed.length).map((r) => {
            const w = byId.get(r.wordId)!
            return (
              <div className="card" key={r.wordId}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>{w.word}</strong><span className="muted">{r.matched}/{r.total}</span>
                </div>
                <div className="danger">놓친 뜻: {r.missed.join(', ')}</div>
                <Link to={`/tree?start=${w.id}`} className="btn" style={{ marginTop: 8 }}>파생 트리 보기</Link>
              </div>
            )
          })}
          <button className="btn btn-primary btn-block" onClick={() => { setResult(null); setStarted(false) }}>다시 보기</button>
          <Link to="/" className="btn btn-block">홈으로</Link>
        </div>
      )}
    </main>
  )
}
