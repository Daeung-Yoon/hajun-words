import { useMemo } from 'react'
import { Link } from 'react-router'
import { useApp } from '../app/AppContext'
import { daysOf, rangeName } from '../content/range'
import { selectRange } from '../store/ranges'

const MODES = [
  { to: '/tree', label: '단어', hint: '넘기며 보기' },
  { to: '/mock', label: '학원 모의시험', hint: '전체' },
]

export default function Home() {
  const { status, error, bank, banks, bankErrors, range, rangeWords, refreshRange, selectBank } = useApp()
  const days = useMemo(() => (bank ? daysOf(bank) : []), [bank])

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
  const startDay = range ? days.find((d) => d.from === range.from)?.label ?? '' : ''
  const endDay = range ? days.find((d) => d.to === range.to)?.label ?? '' : ''

  const apply = async (from: number, to: number) => {
    await selectRange({ bankId: bank.id, from, to, name: rangeName(bank, from, to) })
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
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>{rangeName(bank, range.from, range.to)}</strong><span className="muted">{total}단어</span>
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>Day를 골라 주세요</p>
        )}
      </section>
      <div className="grid-2">
        {MODES.map((m) => (
          <Link key={m.to} to={hasRange ? m.to : '#'} className="btn" aria-disabled={hasRange ? undefined : 'true'}
            style={hasRange ? undefined : { opacity: 0.45, pointerEvents: 'none' }}>
            <span className="stack" style={{ textAlign: 'center' }}>
              <strong style={{ display: 'block' }}>{m.label}</strong>
              <small className="muted" style={{ display: 'block', marginTop: 2 }}>{m.hint}</small>
            </span>
          </Link>
        ))}
      </div>
      <p className="muted center" style={{ marginTop: 24 }}><Link to="/mic-test">마이크 테스트</Link></p>
    </main>
  )
}
