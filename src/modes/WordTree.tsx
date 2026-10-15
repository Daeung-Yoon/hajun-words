import type { Sense, Word } from '../content/schema'
import { blankAnswer } from '../content/blank'
import { canSpeak, speak } from '../speech/tts'

function Example({ sense }: { sense: Sense }) {
  const target = blankAnswer(sense)
  const i = target ? sense.example.indexOf(target) : -1
  if (i < 0) return <div className="example">{sense.example}</div>
  return (
    <div className="example">
      {sense.example.slice(0, i)}<mark>{target}</mark>{sense.example.slice(i + target.length)}
    </div>
  )
}

export default function WordTree({ word, mySentences = [] }: { word: Word; mySentences?: string[] }) {
  return (
    <article className="stack">
      {word.image && <img src={`${import.meta.env.BASE_URL}content/${word.image}`} alt="" style={{ width: '100%', borderRadius: 14 }} />}
      <div className="tree-core">
        <div className="row" style={{ justifyContent: 'center' }}>
          <span className="big">{word.word}</span>
          {canSpeak() && <button className="btn" aria-label="발음 듣기" onClick={() => speak(word.word)}>🔊</button>}
        </div>
        <div className="muted">{word.pos} {word.ipa}</div>
        <div style={{ marginTop: 8 }}><strong>{word.core.ko}</strong></div>
        <div className="muted">{word.core.en}</div>
      </div>
      <div className="tree-branches">
        {word.senses.map((s, i) => (
          <div className="branch" key={i}>
            <div className="bridge">{s.bridge || '→'}</div>
            <div><strong>{s.ko}</strong></div>
            <div className="muted">{s.en}</div>
            <Example sense={s} />
            {canSpeak() && <button className="btn" style={{ marginTop: 6, minHeight: 36, padding: '4px 10px' }} onClick={() => speak(s.example)}>🔊 문장</button>}
          </div>
        ))}
      </div>
      {word.etymology && <p className="muted">📜 {word.etymology}</p>}
      {mySentences.length > 0 && (
        <div className="card stack">
          <strong>내 문장</strong>
          {mySentences.map((t, i) => <div key={i}>{t}</div>)}
        </div>
      )}
    </article>
  )
}
