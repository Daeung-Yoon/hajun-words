import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useApp } from '../app/AppContext'
import { daysOf, rangeName } from '../content/range'
import { createRange, listRanges, setCurrentRange } from '../store/ranges'
import type { RangeRecord } from '../store/db'

export default function Range() {
  const { bank, range, refreshRange } = useApp()
  const navigate = useNavigate()
  const days = useMemo(() => (bank ? daysOf(bank) : []), [bank])
  const maxNo = bank ? Math.max(...bank.words.map((w) => w.no)) : 1
  const [from, setFrom] = useState(range?.from ?? days[0]?.from ?? 1)
  const [to, setTo] = useState(range?.to ?? days[0]?.to ?? 1)
  const [recent, setRecent] = useState<RangeRecord[]>([])

  useEffect(() => { void listRanges().then(setRecent) }, [])

  useEffect(() => {
    if (!bank) return
    setFrom(range?.from ?? days[0]?.from ?? 1)
    setTo(range?.to ?? days[0]?.to ?? 1)
  }, [bank, range, days])

  if (!bank) return null
  const startDay = days.find((d) => d.from === from)?.label ?? ''
  const endDay = days.find((d) => d.to === to)?.label ?? ''
  const valid = from >= 1 && to <= maxNo && from <= to
  const count = bank.words.filter((w) => w.no >= from && w.no <= to).length

  const save = async () => {
    await createRange({ bankId: bank.id, from, to, name: rangeName(bank, from, to, new Date()) })
    await refreshRange()
    navigate('/')
  }
  const pick = async (r: RangeRecord) => {
    await setCurrentRange(r.id!)
    await refreshRange()
    navigate('/')
  }

  return (
    <main className="page stack">
      <div className="topbar"><Link to="/">← 홈</Link><span>범위 선택</span><span /></div>
      <section className="card stack">
        <h2 style={{ marginTop: 0 }}>Day로 고르기</h2>
        <div className="row">
          <div className="stack" style={{ flex: 1 }}><span className="muted">시작</span>
            <select className="input" aria-label="시작" value={startDay} onChange={(e) => {
              const d = days.find((x) => x.label === e.target.value); if (d) { setFrom(d.from); if (to < d.from) setTo(d.to) }
            }}>
              <option value="">—</option>{days.map((d) => <option key={d.label} value={d.label}>{d.label}</option>)}
            </select>
          </div>
          <div className="stack" style={{ flex: 1 }}><span className="muted">끝</span>
            <select className="input" aria-label="끝" value={endDay} onChange={(e) => {
              const d = days.find((x) => x.label === e.target.value); if (d) { setTo(d.to); if (from > d.to) setFrom(d.from) }
            }}>
              <option value="">—</option>{days.map((d) => <option key={d.label} value={d.label}>{d.label}</option>)}
            </select>
          </div>
        </div>
        <h2>번호로 고르기</h2>
        <div className="row">
          <input className="input" type="number" aria-label="시작 번호" min={1} max={maxNo} value={from} onChange={(e) => setFrom(Number(e.target.value))} />
          <span>~</span>
          <input className="input" type="number" aria-label="끝 번호" min={1} max={maxNo} value={to} onChange={(e) => setTo(Number(e.target.value))} />
        </div>
        <button className="btn" onClick={() => { setFrom(1); setTo(range?.to ?? maxNo) }}>지금까지 전부 (1~{range?.to ?? maxNo})</button>
        <p className="muted">{valid ? `${count}단어 · ${rangeName(bank, from, to, new Date())}` : '범위를 확인해 주세요'}</p>
        <button className="btn btn-primary btn-block" disabled={!valid} onClick={save}>이 범위로 공부하기</button>
      </section>
      {recent.length > 0 && (
        <section className="stack">
          <h2>최근 범위</h2>
          {recent.map((r) => (
            <button key={r.id} className="btn btn-block" style={{ justifyContent: 'space-between' }} onClick={() => pick(r)}>
              <span>{r.name}</span><span className="muted">{r.from}~{r.to}</span>
            </button>
          ))}
        </section>
      )}
    </main>
  )
}
