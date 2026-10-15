import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Bank, Word } from '../content/schema'
import { loadBank, loadIndex } from '../content/loadBank'
import { wordsInRange } from '../content/range'
import { getCurrentRange, getSetting, setSetting } from '../store/ranges'
import type { RangeRecord } from '../store/db'

const CURRENT_BANK_KEY = 'currentBankId'

export interface AppValue {
  status: 'loading' | 'ready' | 'error'
  error: string | null
  bank: Bank | null
  banks: Bank[]
  bankErrors: string[]
  range: RangeRecord | null
  rangeWords: Word[]
  refreshRange: () => Promise<void>
  selectBank: (id: string) => Promise<void>
}

export const AppContext = createContext<AppValue | null>(null)

const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function AppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AppValue['status']>('loading')
  const [error, setError] = useState<string | null>(null)
  const [banks, setBanks] = useState<Bank[]>([])
  const [bankErrors, setBankErrors] = useState<string[]>([])
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
        if (index.banks.length === 0) throw new Error('index.json에 단어장이 없어요')
        const settled = await Promise.allSettled(index.banks.map((e) => loadBank(e.file)))
        const loaded = settled.flatMap((s) => (s.status === 'fulfilled' ? [s.value] : []))
        const errors = settled.flatMap((s) => (s.status === 'rejected' ? [message(s.reason)] : []))
        if (loaded.length === 0) throw new Error(errors.join('\n'))
        const cur = await getCurrentRange()
        const saved = await getSetting<string | null>(CURRENT_BANK_KEY, null)
        const chosen = loaded.find((b) => b.id === cur?.bankId)
          ?? loaded.find((b) => b.id === saved)
          ?? loaded[loaded.length - 1]
        if (!alive) return
        setBanks(loaded)
        setBankErrors(errors)
        setBank(chosen)
        setStatus('ready')
      } catch (e) {
        if (!alive) return
        setError(message(e))
        setStatus('error')
      }
    })()
    return () => { alive = false }
  }, [])

  useEffect(() => { if (bank) void refreshRange() }, [bank, refreshRange])

  const selectBank = useCallback(async (id: string) => {
    const b = banks.find((x) => x.id === id)
    if (!b) return
    await setSetting(CURRENT_BANK_KEY, id)
    setRange((r) => (r && r.bankId !== id ? null : r))
    setBank(b)
  }, [banks])

  const rangeWords = useMemo(() => (bank && range ? wordsInRange(bank, range.from, range.to) : []), [bank, range])
  const value = useMemo<AppValue>(
    () => ({ status, error, bank, banks, bankErrors, range, rangeWords, refreshRange, selectBank }),
    [status, error, bank, banks, bankErrors, range, rangeWords, refreshRange, selectBank],
  )
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppValue {
  const v = useContext(AppContext)
  if (!v) throw new Error('useApp must be used inside AppProvider')
  return v
}
