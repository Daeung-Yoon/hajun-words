import { Link } from 'react-router'

export default function Placeholder({ title }: { title: string }) {
  return (
    <main className="page">
      <div className="topbar"><Link to="/">← 홈</Link><span>{title}</span><span /></div>
      <p className="muted">준비 중이에요.</p>
    </main>
  )
}
