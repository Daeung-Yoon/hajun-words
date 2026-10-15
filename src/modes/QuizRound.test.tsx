import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuizRound from './QuizRound'
import type { Question } from '../study/picker'

const qs: Question[] = [
  { kind: 'blank', wordId: 'run', senseIndex: 0, prompt: 'She ____ every morning.', answer: 'run', accept: ['run', 'runs'],
    options: ['fine', 'run', 'bank', 'draw'], explain: 'to move fast on foot' },
  { kind: 'pick', wordId: 'fine', senseIndex: 2, sentence: 'I paid a fine for parking there.', answer: '벌금',
    options: ['좋은', '가는', '벌금', '은행'], explain: 'money you pay for breaking a rule' },
]

describe('QuizRound', () => {
  it('walks through choice questions, shows feedback and finishes with the correct count', async () => {
    const onAnswer = vi.fn(); const onFinish = vi.fn()
    render(<QuizRound questions={qs} inputMode="choice" onAnswer={onAnswer} onFinish={onFinish} />)
    expect(screen.getByText('She ____ every morning.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'bank' }))
    expect(onAnswer).toHaveBeenCalledWith(qs[0], false)
    expect(screen.getByText(/정답: run/)).toBeInTheDocument()
    expect(screen.getByText('to move fast on foot')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '다음' }))
    await userEvent.click(screen.getByRole('button', { name: '벌금' }))
    expect(onAnswer).toHaveBeenCalledWith(qs[1], true)
    await userEvent.click(screen.getByRole('button', { name: '결과 보기' }))
    expect(onFinish).toHaveBeenCalledWith(1)
  })
  it('accepts typed answers in typing mode', async () => {
    const onAnswer = vi.fn()
    render(<QuizRound questions={[qs[0]]} inputMode="typing" onAnswer={onAnswer} onFinish={() => {}} />)
    await userEvent.type(screen.getByLabelText('답 입력'), 'Runs{enter}')
    expect(onAnswer).toHaveBeenCalledWith(qs[0], true)
  })
})
