import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useApp } from '../app/AppContext'
import { recordView } from '../store/progress'
import WordTree from './WordTree'

export default function Tree() {
  const { rangeWords } = useApp()
  const [params] = useSearchParams()
  const start = Math.max(0, rangeWords.findIndex((w) => w.id === params.get('start')))
  const [i, setI] = useState(start)
  const word = rangeWords[i]

  useEffect(() => { if (word) void recordView(word.id) }, [word])

  if (!word) return <main className="page"><p className="muted">범위에 단어가 없어요.</p><Link to="/" className="btn">홈으로</Link></main>
  return (
    <main className="page stack">
      <div className="topbar"><Link to="/">← 홈</Link><span>파생 트리 {i + 1}/{rangeWords.length}</span><span /></div>
      <WordTree word={word} />
      <div className="row">
        <button className="btn" style={{ flex: 1 }} disabled={i === 0} onClick={() => setI(i - 1)}>이전</button>
        <button className="btn btn-primary" style={{ flex: 1 }} disabled={i === rangeWords.length - 1} onClick={() => setI(i + 1)}>다음</button>
      </div>
    </main>
  )
}
