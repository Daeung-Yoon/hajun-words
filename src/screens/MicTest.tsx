import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { listen, probeAvailability, type ListenOptions } from '../speech/stt'

/** 음성 인식이 안 될 때 설정을 바꿔 가며 눌러 보는 숨은 화면(/mic-test). 결과를 그대로 읽어 보내 달라고 한다. */
interface Variant { id: string; label: string; hint: string; lang: string; opts?: ListenOptions }

const VARIANTS: Variant[] = [
  { id: 'base', label: '① 기본(ko-KR, 지금 설정)', hint: '"달리다"라고 말해요', lang: 'ko-KR' },
  { id: 'nointerim', label: '② ko-KR, 중간 결과 끄기', hint: '"달리다"', lang: 'ko-KR', opts: { interimResults: false } },
  { id: 'cont', label: '③ ko-KR, continuous 켜기', hint: '"달리다" 말하고 다시 눌러 멈춰요', lang: 'ko-KR', opts: { continuous: true } },
  { id: 'alts', label: '④ ko-KR, 후보 5개', hint: '"달리다"', lang: 'ko-KR', opts: { maxAlternatives: 5 } },
  { id: 'nogum', label: '⑤ ko-KR, 마이크 미리 안 열기', hint: '"달리다"', lang: 'ko-KR', opts: { preopenMic: false } },
  { id: 'ko', label: '⑥ 언어 "ko"', hint: '"달리다"', lang: 'ko' },
  { id: 'none', label: '⑦ 언어 지정 없음(폰 기본)', hint: '"달리다"', lang: '' },
  { id: 'en', label: '⑧ 영어 en-US', hint: '"apple"이라고 말해요', lang: 'en-US' },
]

interface Outcome { heard: string; trace?: string; error?: string }

export default function MicTest() {
  const [avail, setAvail] = useState<string>('확인 중…')
  const [running, setRunning] = useState<string | null>(null)
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({})
  const stopRef = useRef<() => void>(() => {})

  useEffect(() => {
    let alive = true
    Promise.all([probeAvailability('ko-KR'), probeAvailability('en-US')]).then((r) => { if (alive) setAvail(r.join(' / ')) })
    return () => { alive = false; stopRef.current() }
  }, [])

  const run = (v: Variant) => {
    stopRef.current()
    if (running === v.id) { setRunning(null); return }
    setRunning(v.id)
    setOutcomes((o) => ({ ...o, [v.id]: { heard: '' } }))
    stopRef.current = listen(v.lang, (text) => setOutcomes((o) => ({ ...o, [v.id]: { ...o[v.id], heard: text } })), (error, trace) => {
      stopRef.current = () => {}
      setRunning(null)
      setOutcomes((o) => ({ ...o, [v.id]: { heard: o[v.id]?.heard ?? '', error, trace } }))
    }, v.opts)
  }

  return (
    <main className="page stack">
      <div className="topbar">
        <Link to="/">← 홈</Link>
        <span>마이크 테스트</span>
        <span />
      </div>
      <p className="muted">버튼을 누르고 바로 말해요. 아래에 나오는 "들은 말"과 "진단" 줄을 그대로 보내 주세요.</p>
      <div className="card"><div className="muted" style={{ fontSize: '.8rem', wordBreak: 'break-all' }}>지원: {avail}</div></div>
      {VARIANTS.map((v) => {
        const on = running === v.id
        const out = outcomes[v.id]
        return (
          <div className="card stack" key={v.id}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted">{v.hint}</span>
              <button type="button" className={`btn ${on ? 'btn-primary' : ''}`} aria-pressed={on} onClick={() => run(v)}>🎤 {v.label}</button>
            </div>
            {on && <div className="muted">듣고 있어요…</div>}
            {out && !on && (
              <div style={{ fontSize: '.85rem' }}>
                <div>들은 말: {out.heard || '(없음)'}</div>
                {out.trace && <div className="muted" style={{ fontSize: '.75rem', wordBreak: 'break-all' }}>진단: {out.trace}</div>}
              </div>
            )}
          </div>
        )
      })}
    </main>
  )
}
