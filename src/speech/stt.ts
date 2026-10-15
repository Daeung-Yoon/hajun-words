/** 브라우저 음성 인식(Web Speech API) 얇은 래퍼. 지원 안 하면 canListen() 이 false. */

interface RecognitionLike {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous?: boolean
  onresult: ((e: RecognitionEventLike) => void) | null
  onnomatch?: (() => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
  start(): void
  stop(): void
  abort(): void
}
type RecognitionCtor = new () => RecognitionLike
export interface RecognitionEventLike {
  results: ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }>
}

/** 결과 목록을 한 문장으로 합친다(안드로이드 Chrome 은 중간 결과가 여러 조각으로 온다). */
export function joinTranscript(e: RecognitionEventLike): string {
  let out = ''
  for (let i = 0; i < e.results.length; i++) out += e.results[i][0]?.transcript ?? ''
  return out
}

function ctor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function canListen(): boolean {
  return ctor() !== null
}

/** 실패 코드를 아이가 읽을 수 있는 문장으로. */
export function describeListenError(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed': return '마이크 권한을 허용해 주세요. 주소창 옆 자물쇠에서 바꿀 수 있어요.'
    case 'no-speech':
    case 'no-match': return '말소리를 못 들었어요. 버튼을 누른 뒤 바로 말해 주세요.'
    case 'audio-capture': return '마이크를 찾지 못했어요.'
    case 'network': return '음성 인식에 인터넷이 필요해요.'
    case 'aborted': return ''
    case 'unsupported': return '이 브라우저는 음성 인식을 지원하지 않아요. Chrome 으로 열어 주세요.'
    default: return `음성 인식이 안 됐어요 (${code})`
  }
}

/**
 * 한 번 듣고 결과를 돌려준다. 끝나면 onEnd(error) 가 불린다(성공·중단이면 error 없음).
 * 돌려주는 함수를 부르면 중단된다.
 */
export function listen(lang: string, onResult: (text: string) => void, onEnd: (error?: string) => void): () => void {
  const C = ctor()
  if (!C) { onEnd('unsupported'); return () => {} }
  let rec: RecognitionLike
  let failed: string | undefined
  let heard = false
  let ended = false
  const finish = (error?: string) => { if (ended) return; ended = true; onEnd(error) }
  try {
    rec = new C()
    rec.lang = lang
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.continuous = false
    rec.onresult = (e) => {
      const text = joinTranscript(e)
      if (!text) return
      heard = true
      onResult(text)
    }
    rec.onnomatch = () => { failed = failed ?? 'no-match' }
    rec.onerror = (e) => { failed = e.error; console.warn('[stt] error', e.error) }
    rec.onend = () => finish(failed ?? (heard ? undefined : 'no-speech'))
    rec.start()
  } catch (e) {
    console.warn('[stt] start failed', e)
    finish('unsupported')
    return () => {}
  }
  return () => { try { rec.abort() } catch { /* 이미 끝남 */ } finish('aborted') }
}

/** 음성 인식 결과를 답안 칸에 넣기 좋게 다듬는다: 앞뒤 공백·마침표 제거. */
export const tidyHeard = (text: string) => text.trim().replace(/[.。!?]+$/u, '').trim()
