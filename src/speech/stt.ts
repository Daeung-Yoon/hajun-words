/** 브라우저 음성 인식(Web Speech API) 얇은 래퍼. 지원 안 하면 canListen() 이 false. */

interface RecognitionLike {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous?: boolean
  onstart?: (() => void) | null
  onaudiostart?: (() => void) | null
  onsoundstart?: (() => void) | null
  onspeechstart?: (() => void) | null
  onspeechend?: (() => void) | null
  onsoundend?: (() => void) | null
  onaudioend?: (() => void) | null
  onresult: ((e: RecognitionEventLike) => void) | null
  onnomatch?: (() => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
  start(): void
  stop(): void
  abort(): void
}
type RecognitionCtor = (new () => RecognitionLike) & {
  /** Chrome 139+: 이 언어를 클라우드/기기 안에서 인식할 수 있는지. */
  available?: (o: { langs: string[]; processLocally?: boolean }) => Promise<string>
}
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

/** 브라우저가 이 언어를 인식할 수 있다고 하는지(클라우드·기기 안 각각). 구형 브라우저면 "없음". */
export async function probeAvailability(lang: string): Promise<string> {
  const C = ctor()
  if (!C) return '음성 인식 없음'
  const available = C.available
  if (typeof available !== 'function') return 'available() 없음(Chrome 139 미만)'
  const ask = async (processLocally: boolean) => {
    try { return await available.call(C, { langs: [lang], processLocally }) } catch (e) { return `오류 ${(e as Error)?.name ?? e}` }
  }
  const [cloud, local] = await Promise.all([ask(false), ask(true)])
  return `${lang} 클라우드 ${cloud} · 기기 안 ${local}`
}

export interface ListenOptions {
  interimResults?: boolean
  continuous?: boolean
  maxAlternatives?: number
  /** 인식 전에 getUserMedia 로 마이크를 한 번 여는지(기본 true). */
  preopenMic?: boolean
}

/** 실패 코드를 아이가 읽을 수 있는 문장으로. */
export function describeListenError(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed': return '마이크 권한을 허용해 주세요. 주소창 옆 자물쇠에서 바꿀 수 있어요.'
    case 'no-speech':
    case 'no-match':
    case 'silent-end': return '말소리를 못 들었어요. 버튼을 누른 뒤 바로 말해 주세요. 키보드의 🎤 버튼으로도 말할 수 있어요.'
    case 'audio-capture': return '마이크를 찾지 못했어요.'
    case 'network': return '음성 인식에 인터넷이 필요해요.'
    case 'aborted': return ''
    case 'unsupported': return '이 브라우저는 음성 인식을 지원하지 않아요. Chrome 으로 열어 주세요.'
    default: return `음성 인식이 안 됐어요 (${code})`
  }
}

/** 어디서 돌아가는지 한 줄로: 홈 화면 앱인지 탭인지, Android·Chrome 버전. */
function envSummary(): string {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return ''
  const ua = navigator.userAgent ?? ''
  const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches
  const android = /Android (\d+)/.exec(ua)?.[1]
  const chrome = /Chrome\/(\d+)/.exec(ua)?.[1]
  return [standalone ? '앱' : '탭', android && `Android ${android}`, chrome && `Chrome ${chrome}`].filter(Boolean).join(' ')
}

/**
 * 한 번 듣고 결과를 돌려준다. 끝나면 onEnd(error, trace) 가 불린다(성공·중단이면 error 없음).
 * trace 는 무슨 일이 있었는지 한 줄 기록(어느 단계에서 끊겼는지 보려고 화면에 작게 보여 준다).
 * 돌려주는 함수를 부르면 중단된다.
 */
export function listen(
  lang: string,
  onResult: (text: string) => void,
  onEnd: (error?: string, trace?: string) => void,
  opts: ListenOptions = {},
): () => void {
  const C = ctor()
  if (!C) { onEnd('unsupported', envSummary()); return () => {} }
  let rec: RecognitionLike | null = null
  let failed: string | undefined
  let results = 0
  let last = ''
  let ended = false
  const t0 = Date.now()
  const trace: string[] = [envSummary()].filter(Boolean)
  const mark = (s: string) => trace.push(`${s} ${Date.now() - t0}ms`)
  const finish = (error?: string) => {
    if (ended) return
    ended = true
    trace.push(`result×${results}`)
    if (last) trace.push(`heard "${last}"`)
    trace.push(error ?? 'ok')
    onEnd(error, trace.join(' · '))
  }

  const start = () => {
    if (ended) return
    try {
      rec = new C()
      if (lang) rec.lang = lang
      rec.interimResults = opts.interimResults ?? true
      rec.maxAlternatives = opts.maxAlternatives ?? 1
      rec.continuous = opts.continuous ?? false
      rec.onstart = () => mark('start')
      rec.onaudiostart = () => mark('audiostart')
      rec.onsoundstart = () => mark('soundstart')
      rec.onspeechstart = () => mark('speechstart')
      rec.onspeechend = () => mark('speechend')
      rec.onsoundend = () => mark('soundend')
      rec.onaudioend = () => mark('audioend')
      rec.onresult = (e) => {
        const text = joinTranscript(e)
        if (!text) return
        results++
        last = text
        onResult(text)
      }
      rec.onnomatch = () => { mark('nomatch'); failed = failed ?? 'no-match' }
      rec.onerror = (e) => { mark(`error ${e.error}`); failed = e.error; console.warn('[stt] error', e.error) }
      // 오류도 결과도 없이 끝나면 진짜 no-speech 와 구분해 silent-end 로 알린다.
      rec.onend = () => { mark('end'); finish(failed ?? (results > 0 ? undefined : 'silent-end')) }
      rec.start()
    } catch (e) {
      console.warn('[stt] start failed', e)
      mark('start threw')
      finish('unsupported')
    }
  }

  // 안드로이드 Chrome(특히 홈 화면에 설치한 앱)은 마이크를 먼저 한 번 열어 주지 않으면
  // 인식기가 소리를 못 받고 no-speech 로 끝나는 경우가 있다. 권한 프롬프트도 여기서 뜬다.
  const media = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined
  if (opts.preopenMic === false) {
    mark('gum skip')
    start()
  } else if (media?.getUserMedia) {
    media.getUserMedia({ audio: true }).then(
      (stream) => { stream.getTracks().forEach((t) => t.stop()); mark('gum ok'); start() },
      (e: unknown) => {
        const name = (e as { name?: string } | null)?.name ?? String(e)
        console.warn('[stt] getUserMedia failed', name)
        mark(`gum ${name}`)
        if (name === 'NotAllowedError' || name === 'SecurityError') finish('not-allowed')
        else if (name === 'NotFoundError' || name === 'NotReadableError') finish('audio-capture')
        else start()
      },
    )
  } else {
    mark('gum none')
    start()
  }

  return () => { try { rec?.abort() } catch { /* 이미 끝남 */ } finish('aborted') }
}

/** 음성 인식 결과를 답안 칸에 넣기 좋게 다듬는다: 앞뒤 공백·마침표 제거. */
export const tidyHeard = (text: string) => text.trim().replace(/[.。!?]+$/u, '').trim()
