import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useApp } from '../app/AppContext'
import { getStates, getStreak, getTodayCount } from '../store/progress'
import type { Level } from '../study/level'

const MODES = [
  { to: '/tree', label: '파생 트리', hint: '읽기 · 약 5분' },
  { to: '/blank', label: '예문 빈칸', hint: '10문제 · 약 3분' },
  { to: '/pick', label: '뜻 고르기', hint: '10문제 · 약 2분' },
  { to: '/match', label: '영영 매칭', hint: '준비 중', soon: true },
  { to: '/sentence', label: '문장 만들기', hint: '준비 중', soon: true },
  { to: '/mock', label: '학원 모의시험', hint: '전체 · 약 10분' },
]

export default function Home() {
  const { status, error, range, rangeWords } = useApp()
  const [levels, setLevels] = useState<Record<Level, number>>({ 0: 0, 1: 0, 2: 0, 3: 0 })
  const [streak, setStreak] = useState(0)
  const [today, setToday] = useState(0)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const states = await getStates(rangeWords.map((w) => w.id))
      const counts: Record<Level, number> = { 0: 0, 1: 0, 2: 0, 3: 0 }
      for (const s of states.values()) counts[s.level]++
      const [st, td] = await Promise.all([getStreak(), getTodayCount()])
      if (!alive) return
      setLevels(counts); setStreak(st); setToday(td)
    })()
    return () => { alive = false }
  }, [rangeWords])

  if (status === 'loading') return <main className="page"><p className="muted">단어장을 불러오는 중…</p></main>
  if (status === 'error') {
    return (
      <main className="page">
        <h1>단어장을 불러올 수 없어요</h1>
        <p className="danger">{error}</p>
        <p className="muted">아빠에게 알려주세요.</p>
        <button className="btn btn-primary" onClick={() => location.reload()}>다시 시도</button>
      </main>
    )
  }

  const total = rangeWords.length
  const hasRange = total > 0
  const seg = (lv: Level) => ({ width: `${total ? (levels[lv] / total) * 100 : 0}%` })

  return (
    <main className="page stack">
      <h1>하준 영어단어</h1>
      <Link to="/range" className="card stack" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
        {hasRange && range ? (
          <>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>{range.name}</strong><span className="muted">{total}단어</span>
            </div>
            <div className="bar">
              <div className="bar-seg lv3" style={seg(3)} /><div className="bar-seg lv2" style={seg(2)} /><div className="bar-seg lv1" style={seg(1)} />
            </div>
            <div className="muted">확실 {levels[3]} · 익숙 {levels[2]} · 본 적 있음 {levels[1]} · 모름 {levels[0]}</div>
          </>
        ) : (
          <strong>범위를 골라 주세요</strong>
        )}
      </Link>
      <div className="grid-2">
        {MODES.map((m) => {
          const off = !hasRange || m.soon
          return (
            <Link key={m.to} to={off ? '#' : m.to} className="btn" aria-disabled={off ? 'true' : undefined}
              style={off ? { opacity: 0.45, pointerEvents: 'none' } : undefined}>
              <span className="stack" style={{ textAlign: 'center' }}>
                <strong style={{ display: 'block' }}>{m.label}</strong>
                <small className="muted" style={{ display: 'block', marginTop: 2 }}>{m.hint}</small>
              </span>
            </Link>
          )
        })}
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="muted">🔥 {streak}일 연속 · 오늘 {today}문제</span>
        <span className="row"><Link to="/stats" className="btn">기록</Link><Link to="/settings" className="btn">설정</Link></span>
      </div>
    </main>
  )
}
