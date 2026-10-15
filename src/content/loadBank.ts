import { BankIndexSchema, BankSchema, type Bank, type BankIndex } from './schema'
import { validateBank } from './validate'

export class BankLoadError extends Error {
  constructor(message: string, public readonly file: string) {
    super(message)
    this.name = 'BankLoadError'
  }
}

const base = () => `${import.meta.env.BASE_URL}content/`

async function fetchJson(path: string): Promise<unknown> {
  let res: Response
  try {
    res = await fetch(base() + path, { cache: 'no-cache' })
  } catch {
    throw new BankLoadError(`${path} 를 불러올 수 없어요 (네트워크)`, path)
  }
  if (!res.ok) throw new BankLoadError(`${path} 를 불러올 수 없어요 (${res.status})`, path)
  try {
    return await res.json()
  } catch {
    throw new BankLoadError(`${path} 가 JSON이 아니에요`, path)
  }
}

export async function loadIndex(): Promise<BankIndex> {
  const data = await fetchJson('index.json')
  const parsed = BankIndexSchema.safeParse(data)
  if (!parsed.success) throw new BankLoadError('index.json 형식이 잘못됐어요', 'index.json')
  return parsed.data
}

export async function loadBank(file: string): Promise<Bank> {
  const data = await fetchJson(file)
  const errors = validateBank(data)
  if (errors.length) throw new BankLoadError(`${file}: ${errors.slice(0, 3).join('; ')}`, file)
  return BankSchema.parse(data)
}
