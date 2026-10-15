import type { Sense } from './schema'

export const BLANK = '____'

/** example와 blank의 공통 앞뒤를 제거해 빈칸에 들어갈 실제 형태를 돌려준다. 못 찾으면 ''. */
export function blankAnswer(sense: Pick<Sense, 'example' | 'blank'>): string {
  const i = sense.blank.indexOf(BLANK)
  if (i < 0) return ''
  const prefix = sense.blank.slice(0, i)
  const suffix = sense.blank.slice(i + BLANK.length)
  const { example } = sense
  if (!example.startsWith(prefix) || !example.endsWith(suffix)) return ''
  const answer = example.slice(prefix.length, example.length - suffix.length)
  return answer.trim()
}
