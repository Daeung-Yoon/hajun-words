import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import { recordView, resetProgress, getStates } from './progress'
import { createRange } from './ranges'
import { exportAll, importAll } from './exportImport'

beforeEach(async () => { await resetProgress() })

describe('export/import', () => {
  it('round-trips all tables', async () => {
    await recordView('run', 1000)
    await createRange({ bankId: 'b', from: 1, to: 3, name: 'r' }, 1000)
    const json = await exportAll()
    await resetProgress()
    await importAll(json)
    expect((await getStates(['run'])).get('run')?.level).toBe(1)
    expect(await db.ranges.count()).toBe(1)
    expect(await db.settings.count()).toBe(1)
  })
  it('rejects invalid input without touching existing data', async () => {
    await recordView('run', 1000)
    await expect(importAll('not json')).rejects.toThrow()
    await expect(importAll(JSON.stringify({ hello: 1 }))).rejects.toThrow()
    expect(await db.wordState.count()).toBe(1)
  })
})
