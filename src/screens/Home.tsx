import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useApp } from '../app/AppContext'
import { daysOf, rangeName } from '../content/range'
import { getStates, getStreak, getTodayCount } from '../store/progress'
import { selectRange } from '../store/ranges'
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
  const { status, error, bank, banks, bankErrors, range, rangeWords, refreshRange, selectBank } = useApp()
  const [levels, setLevels] = useState<Record<Level, number>>({ 0: 0, 1: 0, 2: 0, 3: 0 })
  const [streak, setStreak] = useState(0)
  const [today, setToday] = useState(0)
  const days = useMemo(() => (bank ? daysOf(bank) : []), [bank])

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
  if (status === 'error' || !bank) {
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
  const hasRange = total > 0 && range !== null
  const seg = (lv: Level) => ({ width: `${total ? (levels[lv] / total) * 100 : 0}%` })
  const startDay = range ? days.find((d) => d.from === range.from)?.label ?? '' : ''
  const endDay = range ? days.find((d) => d.to === range.to)?.label ?? '' : ''

  const apply = async (from: number, to: number) => {
    await selectRange({ bankId: bank.id, from, to, name: rangeName(bank, from, to, new Date()) })
    await refreshRange()
  }
  const pickStart = (label: string) => {
    const d = days.find((x) => x.label === label)
    if (!d) return
    const to = range && endDay && range.to >= d.from ? range.to : d.to
    void apply(d.from, to)
  }
  const pickEnd = (label: string) => {
    const d = days.find((x) => x.label === label)
    if (!d) return
    const from = range && startDay && range.from <= d.to ? range.from : d.from
    void apply(from, d.to)
  }

  return (
    <main className="page stack">
      <h1>하준 영어단어</h1>
      {bankErrors.length > 0 && (
        <p className="danger">일부 단어장을 불러오지 못했어요: {bankErrors.join(' / ')} 아빠에게 알려주세요.</p>
      )}
      <section className="card stack">
        {banks.length > 1 && (
          <select className="input" aria-label="단어장" value={bank.id} onChange={(e) => { void selectBank(e.target.value) }}>
            {banks.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
        )}
        <div className="row">
          <div className="stack" style={{ flex: 1 }}><span className="muted">시작</span>
            <select className="input" aria-label="시작" value={startDay} onChange={(e) => pickStart(e.target.value)}>
              <option value="">—</option>{days.map((d) => <option key={d.label} value={d.label}>{d.label}</option>)}
            </select>
          </div>
          <div className="stack" style={{ flex: 1 }}><span className="muted">끝</span>
            <select className="input" aria-label="끝" value={endDay} onChange={(e) => pickEnd(e.target.value)}>
              <option value="">—</option>{days.map((d) => <option key={d.label} value={d.label}>{d.label}</option>)}
            </select>
          </div>
        </div>
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
          <p className="muted" style={{ margin: 0 }}>Day를 골라 주세요</p>
        )}
      </section>
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
