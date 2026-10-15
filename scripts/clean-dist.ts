import { rm } from 'node:fs/promises'
// Node 24의 fs.rmSync는 한글 경로에서 크래시하므로 비동기 rm으로 dist를 지운다.
await rm(new URL('../dist/', import.meta.url), { recursive: true, force: true })
