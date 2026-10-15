import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useApp } from '../app/AppContext'
import { getStates } from '../store/progress'
import { listRanges } from '../store/ranges'
import { isStale, type WordState } from '../study/level'
import type { RangeRecord } from '../store/db'

const LEVEL_LABEL = ['모름', '본 적 있음', '익숙', '확실']

export default function Stats() {
  const { rangeWords } = useApp()
  const [states, setStates] = useState<Map<string, WordState>>(new Map())
  const [ranges, setRanges] = useState<RangeRecord[]>([])
  const [onlyUnknown, setOnlyUnknown] = useState(false)

  useEffect(() => {
    void getStates(rangeWords.map((w) => w.id)).then(setStates)
    void listRanges().then(setRanges)
  }, [rangeWords])

  const now = Date.now()
  const rows = rangeWords.filter((w) => !onlyUnknown || (states.get(w.id)?.level ?? 0) === 0)

  return (
    <main className="page stack">
      <div className="topbar"><Link to="/">← 홈</Link><span>기록</span><span /></div>
      <h2>범위별 점수</h2>
      <div className="card stack">
        <div className="row muted" style={{ justifyContent: 'space-between' }}><span>범위</span><span>모의시험 최고 · 학원</span></div>
        {ranges.length === 0 && <p className="muted">아직 범위가 없어요.</p>}
        {ranges.map((r) => (
          <div className="row" style={{ justifyContent: 'space-between' }} key={r.id}>
            <span>{r.name}</span>
            <span><span>{r.mockBest ?? '-'}</span> · <span>{r.academyScore ?? '-'}</span></span>
          </div>
        ))}
      </div>
      <h2>이번 범위 단어</h2>
      <label className="row"><input type="checkbox" checked={onlyUnknown} onChange={(e) => setOnlyUnknown(e.target.checked)} /> 모름만 보기</label>
      <div className="stack">
        {rows.map((w) => {
          const s = states.get(w.id)
          const lv = s?.level ?? 0
          return (
            <div className={`card row ${s && isStale(s, now) ? 'stale' : ''}`} style={{ justifyContent: 'space-between', padding: '10px 14px' }} key={w.id}>
              <span><strong>{w.word}</strong> <span className="muted">{w.senses.map((x) => x.ko).join(', ')}</span></span>
              <span className={`badge lv${lv}`}>{LEVEL_LABEL[lv]}</span>
            </div>
          )
        })}
      </div>
    </main>
  )
}
