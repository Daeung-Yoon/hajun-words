import { useEffect, useRef, useState, type TouchEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useApp } from '../app/AppContext'
import { recordView } from '../store/progress'
import { getSetting, setSetting } from '../store/ranges'
import WordTree, { revealSteps } from './WordTree'

const HIDE_KEY = 'hideMeanings'
const SWIPE_PX = 50

export default function Tree() {
  const { rangeWords } = useApp()
  const [params] = useSearchParams()
  const start = Math.max(0, rangeWords.findIndex((w) => w.id === params.get('start')))
  const [i, setI] = useState<number | null>(null)
  const idx = Math.min(i ?? start, Math.max(0, rangeWords.length - 1))
  const word = rangeWords[idx]
  const [hide, setHide] = useState(false)
  const [reveal, setReveal] = useState(0)
  const touch = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => { void getSetting(HIDE_KEY, false).then(setHide) }, [])
  useEffect(() => { if (word) void recordView(word.id) }, [word])
  useEffect(() => { setReveal(0) }, [word, hide])

  const go = (n: number) => { if (n >= 0 && n < rangeWords.length) setI(n) }
  const toggleHide = () => { const next = !hide; setHide(next); void setSetting(HIDE_KEY, next) }
  const onTouchStart = (e: TouchEvent) => { const t = e.touches[0]; touch.current = t ? { x: t.clientX, y: t.clientY } : null }
  const onTouchEnd = (e: TouchEvent) => {
    const s = touch.current; const t = e.changedTouches[0]; touch.current = null
    if (!s || !t) return
    const dx = t.clientX - s.x, dy = t.clientY - s.y
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return
    go(dx < 0 ? idx + 1 : idx - 1)
  }

  if (!word) return <main className="page"><p className="muted">범위에 단어가 없어요.</p><Link to="/" className="btn">홈으로</Link></main>
  const total = revealSteps(word)
  const done = !hide || reveal >= total
  return (
    <main className="page stack" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="topbar">
        <Link to="/">← 홈</Link>
        <span>단어 {idx + 1}/{rangeWords.length}</span>
        <button className={`btn ${hide ? 'btn-primary' : ''}`} aria-pressed={hide} style={{ minHeight: 36, padding: '4px 10px' }} onClick={toggleHide}>뜻 가리기</button>
      </div>
      <div onClick={() => { if (!done) setReveal(reveal + 1) }} style={done ? undefined : { cursor: 'pointer' }}>
        <WordTree word={word} reveal={hide ? reveal : undefined} />
        {!done && <p className="muted center" style={{ marginTop: 10 }}>탭해서 뜻 보기 ({reveal}/{total})</p>}
      </div>
      <div className="row">
        <button className="btn" style={{ flex: 1 }} disabled={idx === 0} onClick={() => go(idx - 1)}>이전</button>
        <button className="btn btn-primary" style={{ flex: 1 }} disabled={idx === rangeWords.length - 1} onClick={() => go(idx + 1)}>다음</button>
      </div>
    </main>
  )
}
