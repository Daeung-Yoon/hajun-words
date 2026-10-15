/** 브라우저 음성 인식(Web Speech API) 얇은 래퍼. 지원 안 하면 canListen() 이 false. */

interface RecognitionLike {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
type RecognitionCtor = new () => RecognitionLike

function ctor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function canListen(): boolean {
  return ctor() !== null
}

/** 한 번 듣고 결과를 돌려준다. 돌려주는 함수를 부르면 중단된다. */
export function listen(lang: string, onResult: (text: string) => void, onEnd: () => void): () => void {
  const C = ctor()
  if (!C) { onEnd(); return () => {} }
  const rec = new C()
  rec.lang = lang
  rec.interimResults = false
  rec.maxAlternatives = 1
  rec.onresult = (e) => onResult(e.results[0][0].transcript)
  rec.onerror = () => onEnd()
  rec.onend = () => onEnd()
  rec.start()
  return () => rec.abort()
}

/** 음성 인식 결과를 답안 칸에 넣기 좋게 다듬는다: 앞뒤 공백·마침표 제거. */
export const tidyHeard = (text: string) => text.trim().replace(/[.。!?]+$/u, '').trim()
