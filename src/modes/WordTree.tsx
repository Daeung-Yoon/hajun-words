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

/** 뜻 가리기 모드에서 탭으로 열리는 단계 수: 핵심 1 + 뜻 n + 어원(있으면) 1 */
export const revealSteps = (word: Word) => 1 + word.senses.length + (word.etymology ? 1 : 0)

interface Props {
  word: Word
  mySentences?: string[]
  /** 보여 줄 단계 수. 생략하면 전부 보여 준다. 0이면 단어만. */
  reveal?: number
}

export default function WordTree({ word, mySentences = [], reveal }: Props) {
  const steps = reveal ?? revealSteps(word)
  const showCore = steps >= 1
  const senses = word.senses.slice(0, Math.max(0, steps - 1))
  const showEtymology = steps >= revealSteps(word)
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()

  return (
    <article className="stack">
      {word.image && <img src={`${import.meta.env.BASE_URL}content/${word.image}`} alt="" style={{ width: '100%', borderRadius: 14 }} />}
      <div className="tree-core">
        <div className="row" style={{ justifyContent: 'center' }}>
          <span className="big">{word.word}</span>
          {canSpeak() && <button className="btn" aria-label="발음 듣기" onClick={(e) => { stop(e); speak(word.word) }}>🔊</button>}
        </div>
        <div className="muted">{word.pos} {word.ipa}</div>
        {showCore && (
          <>
            <div style={{ marginTop: 8 }}><strong>{word.core.ko}</strong></div>
            <div className="muted">{word.core.en}</div>
          </>
        )}
      </div>
      {senses.length > 0 && (
        <div className="tree-branches">
          {senses.map((s, i) => (
            <div className="branch" key={i}>
              <div className="bridge">{s.bridge || '→'}</div>
              <div><strong>{s.ko}</strong></div>
              <div className="muted">{s.en}</div>
              <Example sense={s} />
              {canSpeak() && <button className="btn" style={{ marginTop: 6, minHeight: 36, padding: '4px 10px' }} onClick={(e) => { stop(e); speak(s.example) }}>🔊 문장</button>}
            </div>
          ))}
        </div>
      )}
      {showEtymology && word.etymology && <p className="muted">📜 {word.etymology}</p>}
      {mySentences.length > 0 && (
        <div className="card stack">
          <strong>내 문장</strong>
          {mySentences.map((t, i) => <div key={i}>{t}</div>)}
        </div>
      )}
    </article>
  )
}
