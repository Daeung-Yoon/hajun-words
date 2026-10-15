import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BankIndexSchema } from '../src/content/schema'
import { validateBank } from '../src/content/validate'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const contentDir = resolve(root, 'public/content')
const index = BankIndexSchema.parse(JSON.parse(readFileSync(resolve(contentDir, 'index.json'), 'utf8')))

let failed = false
for (const entry of index.banks) {
  const data = JSON.parse(readFileSync(resolve(contentDir, entry.file), 'utf8'))
  const errors = validateBank(data)
  const count = Array.isArray(data?.words) ? data.words.length : 0
  if (count !== entry.wordCount) errors.push(`index.json wordCount(${entry.wordCount}) ≠ 실제(${count})`)
  if (data?.id !== entry.id) errors.push(`index.json id(${entry.id}) ≠ 파일 id(${data?.id})`)
  if (errors.length) {
    failed = true
    console.error(`✗ ${entry.file}`)
    for (const e of errors) console.error(`  - ${e}`)
  } else {
    console.log(`✓ ${entry.file} (${count}단어)`)
  }
}
process.exit(failed ? 1 : 0)
