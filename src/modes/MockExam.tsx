import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useApp } from '../app/AppContext'
import { gradeMockExam, type MockWordResult } from '../study/grading'
import { shuffle } from '../study/picker'
import { recordAnswer, recordSession } from '../store/progress'
import { updateMockBest } from '../store/ranges'
import MockForm from './MockForm'
import WordTree from './WordTree'
import { rangeName } from '../content/range'

export default function MockExam() {
  const { bank, range, rangeWords } = useApp()
  const [detail, setDetail] = useState<string | null>(null)
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
      // 결과 화면으로 바뀔 때까지 busy 를 유지한다(두 번째 탭이 그 틈에 또 저장하는 것을 막음). "다시 보기"에서 푼다.
    } catch (e) {
      busy.current = false
      throw e
    } finally {
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
      {result && detail && byId.get(detail) && (
        <div className="stack">
          <WordTree word={byId.get(detail)!} />
          <button className="btn btn-primary btn-block" onClick={() => { setDetail(null); window.scrollTo(0, 0) }}>결과로 돌아가기</button>
        </div>
      )}
      {result && !detail && (
        <div className="stack">
          <div className="card center"><div className="big">{result.score}점</div><div className="muted">{bank && range ? rangeName(bank, range.from, range.to) : range?.name}</div></div>
          {result.results.filter((r) => r.missed.length).map((r) => {
            const w = byId.get(r.wordId)!
            return (
              <div className="card" key={r.wordId}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>{w.word}</strong><span className="muted">{r.matched}/{r.total}</span>
                </div>
                <div className="danger">놓친 뜻: {r.missed.join(', ')}</div>
                <button className="btn" style={{ marginTop: 8 }} onClick={() => { setDetail(w.id); window.scrollTo(0, 0) }}>단어 보기</button>
              </div>
            )
          })}
          <button className="btn btn-primary btn-block" onClick={() => { busy.current = false; setResult(null); setDetail(null); setStarted(false) }}>다시 보기</button>
          <Link to="/" className="btn btn-block">홈으로</Link>
        </div>
      )}
    </main>
  )
}
