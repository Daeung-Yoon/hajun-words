import { describe, it, expect } from 'vitest'
import { planPull } from './drive-photos'

describe('planPull', () => {
  it('새 이미지만 이름순으로 복사 대상에 넣고, 이미 있는 것과 지원 안 하는 형식은 따로 분류해요', () => {
    const plan = planPull(
      ['b.JPG', 'a.jpg', 'c.png', 'done.jpg', 'inbox.jpeg', 'x.heic', 'memo.txt'],
      ['inbox.jpeg'],
      ['done.jpg'],
    )
    expect(plan.copy).toEqual(['a.jpg', 'b.JPG', 'c.png'])
    expect(plan.skipped).toEqual(['done.jpg', 'inbox.jpeg'])
    expect(plan.unsupported).toEqual(['memo.txt', 'x.heic'])
  })
})

import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach } from 'vitest'
import { pullPhotos } from './drive-photos'

describe('pullPhotos', () => {
  let tmp: string
  let driveRoot: string
  let photosDir: string
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'hajun-drive-'))
    driveRoot = join(tmp, 'drive')
    photosDir = join(tmp, 'photos')
  })
  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true })
  })

  it('Drive 폴더가 없으면 inbox·done 을 만들고 복사할 게 없다고 알려요', async () => {
    await mkdir(driveRoot, { recursive: true })
    const result = await pullPhotos({ driveRoot, photosDir })
    expect(result).toEqual({ copy: [], skipped: [], unsupported: [] })
    expect(await readdir(join(driveRoot, '하준단어장'))).toEqual(['done', 'inbox'])
    expect(await readdir(join(photosDir, 'inbox'))).toEqual([])
  })

  it('새 사진을 photos/inbox/ 로 복사하고 Drive 쪽 원본은 그대로 둬요', async () => {
    await mkdir(join(driveRoot, '하준단어장', 'inbox'), { recursive: true })
    await mkdir(join(photosDir, 'done'), { recursive: true })
    await writeFile(join(driveRoot, '하준단어장', 'inbox', 'day1.jpg'), 'IMG1')
    await writeFile(join(driveRoot, '하준단어장', 'inbox', 'old.jpg'), 'OLD')
    await writeFile(join(driveRoot, '하준단어장', 'inbox', 'note.txt'), 'x')
    await writeFile(join(photosDir, 'done', 'old.jpg'), 'OLD')

    const result = await pullPhotos({ driveRoot, photosDir })

    expect(result).toEqual({ copy: ['day1.jpg'], skipped: ['old.jpg'], unsupported: ['note.txt'] })
    expect(await readFile(join(photosDir, 'inbox', 'day1.jpg'), 'utf8')).toBe('IMG1')
    expect(await readdir(join(photosDir, 'inbox'))).toEqual(['day1.jpg'])
    expect((await readdir(join(driveRoot, '하준단어장', 'inbox'))).sort()).toEqual(['day1.jpg', 'note.txt', 'old.jpg'])
  })
})

import { finishPhotos } from './drive-photos'

describe('finishPhotos', () => {
  let tmp: string
  let driveRoot: string
  let photosDir: string
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'hajun-drive-'))
    driveRoot = join(tmp, 'drive')
    photosDir = join(tmp, 'photos')
    await mkdir(join(driveRoot, '하준단어장', 'inbox'), { recursive: true })
    await mkdir(join(photosDir, 'done'), { recursive: true })
  })
  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true })
  })

  it('로컬 photos/done/ 에 있는 이름만 Drive inbox 에서 done 으로 옮겨요', async () => {
    await writeFile(join(driveRoot, '하준단어장', 'inbox', 'day1.jpg'), 'IMG1')
    await writeFile(join(driveRoot, '하준단어장', 'inbox', 'day2.jpg'), 'IMG2')
    await writeFile(join(photosDir, 'done', 'day1.jpg'), 'IMG1')

    const moved = await finishPhotos({ driveRoot, photosDir })

    expect(moved).toEqual(['day1.jpg'])
    expect(await readdir(join(driveRoot, '하준단어장', 'inbox'))).toEqual(['day2.jpg'])
    expect(await readdir(join(driveRoot, '하준단어장', 'done'))).toEqual(['day1.jpg'])
  })

  it('Drive done 에 같은 이름이 이미 있으면 덮어쓰지 않고 inbox 쪽을 지워요', async () => {
    await mkdir(join(driveRoot, '하준단어장', 'done'), { recursive: true })
    await writeFile(join(driveRoot, '하준단어장', 'inbox', 'day1.jpg'), 'NEW')
    await writeFile(join(driveRoot, '하준단어장', 'done', 'day1.jpg'), 'OLD')
    await writeFile(join(photosDir, 'done', 'day1.jpg'), 'NEW')

    const moved = await finishPhotos({ driveRoot, photosDir })

    expect(moved).toEqual(['day1.jpg'])
    expect(await readdir(join(driveRoot, '하준단어장', 'inbox'))).toEqual([])
    expect(await readFile(join(driveRoot, '하준단어장', 'done', 'day1.jpg'), 'utf8')).toBe('OLD')
  })
})

import { findDriveRoot } from './drive-photos'

describe('findDriveRoot', () => {
  it('D~Z 드라이브에서 "내 드라이브" 또는 "My Drive" 폴더를 찾아요', () => {
    const present = new Set(['H:\\내 드라이브', 'K:\\My Drive'])
    expect(findDriveRoot((p) => present.has(p))).toBe('H:\\내 드라이브')
    expect(findDriveRoot((p) => p === 'K:\\My Drive')).toBe('K:\\My Drive')
  })

  it('없으면 null 을 돌려줘요', () => {
    expect(findDriveRoot(() => false)).toBeNull()
  })
})
