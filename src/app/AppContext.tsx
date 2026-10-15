import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Bank, Word } from '../content/schema'
import { loadBank, loadIndex } from '../content/loadBank'
import { wordsInRange } from '../content/range'
import { getCurrentRange } from '../store/ranges'
import type { RangeRecord } from '../store/db'

export interface AppValue {
  status: 'loading' | 'ready' | 'error'
  error: string | null
  bank: Bank | null
  range: RangeRecord | null
  rangeWords: Word[]
  refreshRange: () => Promise<void>
}

export const AppContext = createContext<AppValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AppValue['status']>('loading')
  const [error, setError] = useState<string | null>(null)
  const [bank, setBank] = useState<Bank | null>(null)
  const [range, setRange] = useState<RangeRecord | null>(null)

  const refreshRange = useCallback(async () => {
    const r = await getCurrentRange()
    setRange(r && bank && r.bankId === bank.id ? r : null)
  }, [bank])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const index = await loadIndex()
        const entry = index.banks[0]
        if (!entry) throw new Error('index.json에 단어장이 없어요')
        const b = await loadBank(entry.file)
        if (!alive) return
        setBank(b)
        setStatus('ready')
      } catch (e) {
        if (!alive) return
        setError(e instanceof Error ? e.message : String(e))
        setStatus('error')
      }
    })()
    return () => { alive = false }
  }, [])

  useEffect(() => { if (bank) void refreshRange() }, [bank, refreshRange])

  const rangeWords = useMemo(() => (bank && range ? wordsInRange(bank, range.from, range.to) : []), [bank, range])
  const value = useMemo<AppValue>(() => ({ status, error, bank, range, rangeWords, refreshRange }), [status, error, bank, range, rangeWords, refreshRange])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppValue {
  const v = useContext(AppContext)
  if (!v) throw new Error('useApp must be used inside AppProvider')
  return v
}
