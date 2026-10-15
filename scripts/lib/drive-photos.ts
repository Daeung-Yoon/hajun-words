import { extname } from 'node:path'

/** Claude가 Read 도구로 읽을 수 있는 사진 형식 */
export const IMAGE_EXTS = ['.jpg', '.jpeg', '.png']

export interface PullPlan {
  copy: string[]
  skipped: string[]
  unsupported: string[]
}

const byName = (a: string, b: string) => a.localeCompare(b, 'en')

/** Drive inbox 파일 목록을 보고 무엇을 photos/inbox/ 로 복사할지 정한다. */
export function planPull(driveFiles: string[], localInbox: string[], localDone: string[]): PullPlan {
  const existing = new Set([...localInbox, ...localDone])
  const plan: PullPlan = { copy: [], skipped: [], unsupported: [] }
  for (const name of [...driveFiles].sort(byName)) {
    if (!IMAGE_EXTS.includes(extname(name).toLowerCase())) plan.unsupported.push(name)
    else if (existing.has(name)) plan.skipped.push(name)
    else plan.copy.push(name)
  }
  return plan
}

import { copyFile, mkdir, readdir, rename, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

/** Drive 안에서 단어장 사진을 두는 폴더 이름 */
export const DRIVE_FOLDER = '하준단어장'

export interface Dirs {
  /** Drive for Desktop 이 미러링하는 "내 드라이브" 경로 */
  driveRoot: string
  /** 저장소의 photos/ 경로 */
  photosDir: string
}

const listFiles = async (dir: string) =>
  (await readdir(dir, { withFileTypes: true })).filter((d) => d.isFile()).map((d) => d.name)

async function ensureDirs({ driveRoot, photosDir }: Dirs) {
  const dirs = {
    driveInbox: join(driveRoot, DRIVE_FOLDER, 'inbox'),
    driveDone: join(driveRoot, DRIVE_FOLDER, 'done'),
    localInbox: join(photosDir, 'inbox'),
    localDone: join(photosDir, 'done'),
  }
  await Promise.all(Object.values(dirs).map((d) => mkdir(d, { recursive: true })))
  return dirs
}

/** Drive inbox 의 새 사진을 photos/inbox/ 로 복사한다. Drive 쪽은 건드리지 않는다. */
export async function pullPhotos(dirs: Dirs): Promise<PullPlan> {
  const d = await ensureDirs(dirs)
  const plan = planPull(await listFiles(d.driveInbox), await listFiles(d.localInbox), await listFiles(d.localDone))
  for (const name of plan.copy) await copyFile(join(d.driveInbox, name), join(d.localInbox, name))
  return plan
}

/** 로컬 photos/done/ 에 있는 사진을 Drive inbox 에서 done 으로 옮긴다(폰에서도 "처리됨"이 보이게). */
export async function finishPhotos(dirs: Dirs): Promise<string[]> {
  const d = await ensureDirs(dirs)
  const localDone = new Set(await listFiles(d.localDone))
  const moved = (await listFiles(d.driveInbox)).filter((n) => localDone.has(n)).sort(byName)
  for (const name of moved) {
    const from = join(d.driveInbox, name)
    const to = join(d.driveDone, name)
    if (existsSync(to)) await rm(from)
    else await rename(from, to)
  }
  return moved
}

/** Drive for Desktop 이 마운트한 "내 드라이브" 경로를 D~Z 드라이브에서 찾는다. 없으면 null. */
export function findDriveRoot(exists: (path: string) => boolean = existsSync): string | null {
  for (let c = 'D'.charCodeAt(0); c <= 'Z'.charCodeAt(0); c++) {
    for (const name of ['내 드라이브', 'My Drive']) {
      const path = `${String.fromCharCode(c)}:\\${name}`
      if (exists(path)) return path
    }
  }
  return null
}
