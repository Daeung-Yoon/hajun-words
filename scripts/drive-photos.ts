// Google Drive for Desktop 이 미러링하는 "내 드라이브/하준단어장/" 과 photos/ 를 오가는 도구.
//   npm run photos -- pull [--from <내 드라이브 경로>]   Drive inbox → photos/inbox/ 복사
//   npm run photos -- done [--from <내 드라이브 경로>]   photos/done/ 에 있는 사진을 Drive inbox → done 으로 이동
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DRIVE_FOLDER, findDriveRoot, finishPhotos, pullPhotos } from './lib/drive-photos'

const args = process.argv.slice(2)
const command = args[0]
const fromIdx = args.indexOf('--from')
const driveRoot = fromIdx >= 0 ? args[fromIdx + 1] : findDriveRoot()

if (command !== 'pull' && command !== 'done') {
  console.error('사용법: npm run photos -- <pull|done> [--from "<내 드라이브 경로>"]')
  process.exit(2)
}
if (!driveRoot) {
  console.error('Google Drive 폴더를 못 찾았어요. Drive for Desktop 이 실행 중이고 로그인돼 있는지 확인하거나 --from 으로 "내 드라이브" 경로를 주세요.')
  process.exit(1)
}

const photosDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'photos')
const dirs = { driveRoot, photosDir }
console.log(`Drive: ${resolve(driveRoot, DRIVE_FOLDER)}`)

if (command === 'pull') {
  const plan = await pullPhotos(dirs)
  for (const n of plan.copy) console.log(`  + ${n}`)
  for (const n of plan.skipped) console.log(`  = ${n} (이미 있음)`)
  for (const n of plan.unsupported) console.log(`  ! ${n} (jpg/png 만 읽을 수 있어요)`)
  console.log(`✓ ${plan.copy.length}장 가져옴 → photos/inbox/`)
} else {
  const moved = await finishPhotos(dirs)
  for (const n of moved) console.log(`  → ${n}`)
  console.log(`✓ ${moved.length}장을 Drive done/ 으로 옮김`)
}
