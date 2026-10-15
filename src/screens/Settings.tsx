import { useEffect, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router'
import { useApp } from '../app/AppContext'
import { listRanges, setAcademyScore, getSetting, setSetting } from '../store/ranges'
import { exportAll, importAll } from '../store/exportImport'
import { resetProgress } from '../store/progress'
import type { RangeRecord } from '../store/db'

export default function Settings() {
  const { bank, refreshRange } = useApp()
  const [ranges, setRanges] = useState<RangeRecord[]>([])
  const [typing, setTyping] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const reload = async () => {
    setRanges((await listRanges()).filter((r) => r.bankId === bank?.id))
    setTyping((await getSetting<'choice' | 'typing'>('blankInputMode', 'choice')) === 'typing')
  }
  useEffect(() => { void reload() }, [bank])

  const saveScore = async (r: RangeRecord, raw: string) => {
    const n = raw.trim() === '' ? null : Number(raw)
    if (n !== null && (Number.isNaN(n) || n < 0 || n > 100)) { setMsg('0~100 사이 숫자를 넣어 주세요'); return }
    await setAcademyScore(r.id!, n)
    setMsg('저장했어요')
  }
  const toggleTyping = async (on: boolean) => { setTyping(on); await setSetting('blankInputMode', on ? 'typing' : 'choice') }
  const doExport = async () => {
    const blob = new Blob([await exportAll()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `hajun-words-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const doImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      await importAll(await f.text())
      await refreshRange(); await reload()
      setMsg('가져왔어요')
    } catch (err) {
      setMsg(err instanceof Error ? err.message : '가져오기 실패')
    } finally {
      e.target.value = ''
    }
  }
  const doReset = async () => {
    if (!window.confirm('모든 진도를 지울까요? 되돌릴 수 없어요.')) return
    await resetProgress(); await refreshRange(); await reload()
    setMsg('초기화했어요')
  }

  return (
    <main className="page stack">
      <div className="topbar"><Link to="/">← 홈</Link><span>설정</span><span /></div>
      {msg && <p className="muted">{msg}</p>}
      <h2>학원 점수</h2>
      <div className="card stack">
        {ranges.length === 0 && <p className="muted">아직 범위가 없어요.</p>}
        {ranges.map((r) => (
          <div className="row" key={`${r.id}-${r.academyScore ?? ''}`} style={{ justifyContent: 'space-between' }}>
            <span>{r.name}</span>
            <input className="input" style={{ width: 90 }} type="number" min={0} max={100} aria-label={`${r.name} 학원 점수`}
              defaultValue={r.academyScore ?? ''} onBlur={(e) => saveScore(r, e.target.value)} />
          </div>
        ))}
      </div>
      <h2>공부 방식</h2>
      <label className="card row"><input type="checkbox" aria-label="빈칸 직접 입력" checked={typing} onChange={(e) => toggleTyping(e.target.checked)} /> 빈칸 직접 입력 (끄면 보기에서 고르기)</label>
      <h2>진도 옮기기</h2>
      <div className="card stack">
        <button className="btn btn-block" onClick={doExport}>내보내기 (JSON 저장)</button>
        <label className="btn btn-block">가져오기 (JSON 선택)<input type="file" accept="application/json" style={{ display: 'none' }} onChange={doImport} /></label>
      </div>
      <h2>위험 구역</h2>
      <button className="btn btn-bad btn-block" onClick={doReset}>진도 초기화</button>
    </main>
  )
}
