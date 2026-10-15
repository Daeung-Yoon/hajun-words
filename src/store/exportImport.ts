import { z } from 'zod'
import { db, ALL_TABLES } from './db'

const DumpSchema = z.object({
  version: z.literal(1),
  exportedAt: z.number(),
  wordState: z.array(z.any()),
  mySentences: z.array(z.any()),
  ranges: z.array(z.any()),
  sessions: z.array(z.any()),
  badges: z.array(z.any()),
  settings: z.array(z.any()),
})
type Dump = z.infer<typeof DumpSchema>

export async function exportAll(): Promise<string> {
  const dump: Dump = {
    version: 1,
    exportedAt: Date.now(),
    wordState: await db.wordState.toArray(),
    mySentences: await db.mySentences.toArray(),
    ranges: await db.ranges.toArray(),
    sessions: await db.sessions.toArray(),
    badges: await db.badges.toArray(),
    settings: await db.settings.toArray(),
  }
  return JSON.stringify(dump, null, 2)
}

export async function importAll(json: string): Promise<void> {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('JSON 파일이 아니에요')
  }
  const parsed = DumpSchema.safeParse(data)
  if (!parsed.success) throw new Error('하준 영어단어 내보내기 파일이 아니에요')
  const d = parsed.data
  await db.transaction('rw', [...ALL_TABLES], async () => {
    for (const t of ALL_TABLES) await t.clear()
    await db.wordState.bulkPut(d.wordState)
    await db.mySentences.bulkPut(d.mySentences)
    await db.ranges.bulkPut(d.ranges)
    await db.sessions.bulkPut(d.sessions)
    await db.badges.bulkPut(d.badges)
    await db.settings.bulkPut(d.settings)
  })
}
