import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { BankSchema, BankIndexSchema, NewWordSchema, type BankIndex } from '../src/content/schema'
import { mergeWords } from '../src/content/merge'
import { validateBank } from '../src/content/validate'

const args = process.argv.slice(2)
const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const bankId = opt('--bank')
const title = opt('--title')
const chunkPath = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--bank' && args[i - 1] !== '--title').pop()
if (!bankId || !chunkPath) {
  console.error('사용법: npm run merge -- --bank <id> [--title "<제목>"] <chunk.json>')
  process.exit(2)
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const contentDir = resolve(root, 'public/content')
const indexPath = resolve(contentDir, 'index.json')
const bankFile = `banks/${bankId}.json`
const bankPath = resolve(contentDir, bankFile)

const chunk = z.object({ words: z.array(NewWordSchema).min(1) }).parse(JSON.parse(readFileSync(resolve(chunkPath), 'utf8')))
const existing = existsSync(bankPath) ? BankSchema.parse(JSON.parse(readFileSync(bankPath, 'utf8'))) : null
if (!existing && !title) {
  console.error(`뱅크 ${bankId} 가 없어요. --title 로 제목을 주면 새로 만들어요.`)
  process.exit(2)
}

const merged = mergeWords(existing, { id: bankId, title: title ?? existing!.title }, chunk.words)
const errors = validateBank(merged)
if (errors.length) {
  console.error('병합 결과에 문제가 있어 저장하지 않았어요:')
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}

writeFileSync(bankPath, JSON.stringify(merged, null, 2) + '\n', 'utf8')
const index: BankIndex = existsSync(indexPath) ? BankIndexSchema.parse(JSON.parse(readFileSync(indexPath, 'utf8'))) : { banks: [] }
const entry = { id: bankId, title: merged.title, file: bankFile, wordCount: merged.words.length }
const i = index.banks.findIndex((b) => b.id === bankId)
if (i >= 0) index.banks[i] = entry; else index.banks.push(entry)
writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n', 'utf8')
const added = merged.words.length - (existing?.words.length ?? 0)
console.log(`✓ ${bankFile}: ${added}개 추가, 총 ${merged.words.length}단어`)
