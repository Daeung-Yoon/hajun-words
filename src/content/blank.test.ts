import { describe, it, expect } from 'vitest'
import { blankAnswer } from './blank'

const sense = (example: string, blank: string) => ({ ko: 'x', en: 'x', bridge: '', example, blank })

describe('blankAnswer', () => {
  it('extracts the inflected form', () => {
    expect(blankAnswer(sense('She runs every morning.', 'She ____ every morning.'))).toBe('runs')
  })
  it('works when blank is at the end', () => {
    expect(blankAnswer(sense('The match ended in a draw.', 'The match ended in a ____.'))).toBe('draw')
  })
  it('returns empty string when example and blank do not line up', () => {
    expect(blankAnswer(sense('She runs fast.', 'He ____ fast.'))).toBe('')
  })
})
