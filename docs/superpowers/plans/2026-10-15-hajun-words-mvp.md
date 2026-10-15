# 하준 영어단어 앱 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 단어장 사진에서 만든 뱅크 JSON을 읽어, 범위를 골라 파생 트리·빈칸·뜻 고르기·모의시험으로 공부하고 기기에 진도를 저장하는 PWA를 GitHub Pages에 배포한다.

**Architecture:** 정적 PWA(Vite + React + TS) 하나가 `public/content/` 아래 뱅크 JSON을 fetch해 zod로 검증하고, 진도는 Dexie(IndexedDB)에 저장한다. 학습 규칙(레벨·출제·채점)은 `src/study/`의 순수 함수로 분리해 단위 테스트한다. 콘텐츠는 Claude Code 스킬 `/add-words`가 사진을 읽어 JSON 조각을 쓰고, `scripts/merge-words.ts`가 뱅크에 병합·검증한다.

**Tech Stack:** Vite, React 19, TypeScript, react-router 7 (HashRouter), Dexie 4, zod, vite-plugin-pwa, Vitest + jsdom + Testing Library + fake-indexeddb, tsx, GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-15-hajun-words-design.md`

## Global Constraints

- 패키지 이름은 `hajun-words`. 폴더명이 한글이라 package.json에 명시.
- Vite `base`는 `/hajun-words/`. 라우팅은 HashRouter(GitHub Pages 404 회피).
- 콘텐츠 경로는 `public/content/banks/<bank-id>.json`, `public/content/index.json`, `public/content/images/`.
- 빈칸 표기는 `____`(언더스코어 4개) 고정.
- 단어 `id`는 철자 소문자. 같은 단어가 다른 Day에 또 나오면 항목을 추가하지 않고 `source`에 `", Day 12"` 형식으로 덧붙인다.
- 레벨 0~3. 정답 2회 연속 → +1. 오답 → 레벨 1(0이면 0 유지). 7일(`7*24*60*60*1000` ms) 이상 미학습 → 흐려짐, 가중치 +2.
- 출제 가중치: 레벨 0→4, 1→3, 2→2, 3→1. 한 회차 10문제, 범위가 10개 미만이면 단어 수.
- 오답 보기는 범위 안에서, 범위가 4단어 미만이면 뱅크 전체에서 보충.
- 모의시험 총점 = 단어 점수 합 / 단어 수 × 100, 반올림. 단어 점수 = 맞힌 뜻 수 / 뜻 수. 레벨 반영은 단어 단위 전부 정답일 때만 정답.
- 출석은 채점 모드 1회차 이상 완료, 기기 로컬 자정 기준.
- `photos/`는 `.gitignore`(교재 사진 저작권). 진도는 저장소에 올라가지 않음.
- 모든 커밋 메시지 끝에 아래 두 줄을 붙인다.
  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01UsTYHJBdDm6zW6qWLfvfTi
  ```
- 앱은 LLM을 호출하지 않는다. 네트워크 요청은 자기 origin의 `content/` fetch뿐.
- UI 문구는 한국어, 아이 눈높이(존댓말 아닌 "~해요" 체).

## Deferred From Spec

- 스펙 11장의 "IndexedDB 사용 불가 시 메모리 저장 + 배너"는 MVP에서 구현하지 않는다. 사생활 보호 모드에서는 Dexie 오류가 콘솔에 남고 진도가 저장되지 않는다. 2차에서 다룬다.
- 스펙 11장의 "발음 미지원 시 버튼 비활성화 + 툴팁"은 버튼을 숨기는 것으로 대체한다.

## Review Focus

1. **범위가 4단어 미만일 때** 빈칸·뜻 고르기 보기가 4개를 못 채워도 앱이 멈추지 않고 뱅크에서 보충하거나 있는 만큼만 보여줘야 한다. → Task 4 `buildBlankQuestion` 테스트.
2. **모의시험 입력의 공백·괄호 힌트·빈 칸**("(가게를) 운영하다" vs "운영하다", "  달리다 ", "")이 채점에서 의도대로 처리돼야 한다. → Task 5 `normalizeKo`, `gradeMockWord` 테스트.
3. **잘못된 가져오기 파일**(JSON 아님, 버전 필드 없음)이 기존 진도를 지우면 안 된다. → Task 7 `importAll` 테스트.
4. **스키마에 맞지 않는 뱅크 JSON**이 앱 전체를 멈추면 안 된다. 해당 뱅크만 제외하고 오류 화면. → Task 2 `validateBank`, Task 8 AppContext 오류 상태.
5. **어제 공부하고 오늘 아직 안 했을 때** 연속 일수가 0이 아니라 유지돼야 한다. 하루를 건너뛴 뒤에야 0. → Task 6 `getStreak` 테스트.

## File Structure

```
package.json, vite.config.ts, tsconfig.json, index.html, .gitignore, .gitattributes
src/main.tsx                     진입. HashRouter + App
src/index.css                    전역 CSS 변수·공통 클래스·다크 모드
src/test/setup.ts                fake-indexeddb, jest-dom
src/content/schema.ts            zod 스키마와 타입 (Sense, Word, Bank, BankIndex)
src/content/blank.ts             blankAnswer(): example/blank 차이로 빈칸 정답 추출
src/content/validate.ts          validateBank(): 구조·중복·번호·빈칸 검사 (순수)
src/content/range.ts             wordsInRange, daysOf, rangeName (순수)
src/content/merge.ts             mergeWords(): 새 단어를 뱅크에 병합 (순수)
src/content/loadBank.ts          fetch + 검증. BankLoadError
src/study/level.ts               WordState, applyView, applyAnswer, isStale, weight
src/study/picker.ts              pickWords, buildBlankQuestion, buildPickQuestion, buildRound
src/study/grading.ts             normalizeKo/En, gradeBlankInput, gradeMockWord, gradeMockExam
src/store/db.ts                  Dexie 테이블 정의
src/store/progress.ts            getStates, recordView, recordAnswer, recordSession, getStreak, getTodayCount, resetProgress
src/store/ranges.ts              createRange, listRanges, getCurrentRange, setCurrentRange, setAcademyScore, updateMockBest, getSetting, setSetting
src/store/exportImport.ts        exportAll, importAll
src/speech/tts.ts                canSpeak, speak
src/app/App.tsx                  라우트 정의
src/app/AppContext.tsx           뱅크·현재 범위 로딩, useApp()
src/screens/Home.tsx             범위 카드, 모드 격자, 출석
src/screens/Range.tsx            범위 선택·저장
src/screens/Stats.tsx            레벨 목록, 범위별 점수 표
src/screens/Settings.tsx         학원 점수, 초기화, 내보내기·가져오기, 입력 방식
src/modes/Tree.tsx               파생 트리 카드
src/modes/QuizRound.tsx          10문제 회차 UI (빈칸·뜻 고르기 공용)
src/modes/QuizScreen.tsx         회차 생성·기록·결과 (mode prop)
src/modes/MockForm.tsx           모의시험 입력 폼 (순수 UI)
src/modes/MockExam.tsx           모의시험 화면 (채점·기록·결과)
public/content/index.json, public/content/banks/sample.json
scripts/validate.ts              npm run validate
scripts/merge-words.ts           npm run merge -- --bank <id> <chunk.json>
.claude/skills/add-words/SKILL.md
.github/workflows/deploy.yml
```

---

### Task 1: 프로젝트 스캐폴드

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `.gitignore`, `.gitattributes`, `src/main.tsx`, `src/app/App.tsx`, `src/index.css`, `src/test/setup.ts`, `src/smoke.test.ts`

**Interfaces:**
- Produces: `npm run dev|build|test|validate|merge`, Vitest 환경(jsdom + fake-indexeddb), 전역 CSS 클래스(`.card .btn .btn-primary .grid-2 .bar .bar-seg .muted .stack .row .input .badge .danger`).

- [ ] **Step 1: 기본 파일 작성**

`package.json`:
```json
{
  "name": "hajun-words",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "validate": "tsx scripts/validate.ts",
    "merge": "tsx scripts/merge-words.ts"
  }
}
```

`.gitignore`:
```
node_modules
dist
photos/
content-work/
*.local
.DS_Store
```

`.gitattributes`:
```
* text=auto eol=lf
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "skipLibCheck": true,
    "noEmit": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "types": ["vite/client"]
  },
  "include": ["src", "scripts", "vite.config.ts"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/hajun-words/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
  },
})
```

`index.html`:
```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#2563eb" />
    <title>하준 영어단어</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import App from './app/App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
```

`src/app/App.tsx` (임시, Task 8에서 교체):
```tsx
export default function App() {
  return <main className="page"><h1>하준 영어단어</h1></main>
}
```

`src/test/setup.ts`:
```ts
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
```

`src/index.css`:
```css
:root {
  --bg: #f6f7fb; --card: #ffffff; --text: #1a1d26; --muted: #6b7280;
  --primary: #2563eb; --primary-text: #ffffff; --ok: #16a34a; --bad: #dc2626;
  --border: #e5e7eb; --lv0: #e5e7eb; --lv1: #fde68a; --lv2: #93c5fd; --lv3: #86efac;
  --radius: 14px;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f1218; --card: #1a1f2b; --text: #eef0f5; --muted: #9aa3b2;
    --border: #2a3140; --lv0: #2a3140; --lv1: #7c5e0a; --lv2: #1e40af; --lv3: #166534;
  }
}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--text);
  font-family: -apple-system, "Segoe UI", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif; font-size: 17px; }
.page { max-width: 560px; margin: 0 auto; padding: 16px 16px 48px; }
h1 { font-size: 1.4rem; margin: 8px 0 16px; }
h2 { font-size: 1.1rem; margin: 20px 0 8px; }
.card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; }
.stack > * + * { margin-top: 12px; }
.row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.btn { display: inline-flex; justify-content: center; align-items: center; gap: 6px; padding: 12px 14px;
  border-radius: 12px; border: 1px solid var(--border); background: var(--card); color: var(--text);
  font-size: 1rem; cursor: pointer; text-decoration: none; min-height: 48px; }
.btn:disabled { opacity: .45; cursor: default; }
.btn-primary { background: var(--primary); color: var(--primary-text); border-color: var(--primary); }
.btn-block { width: 100%; }
.btn-ok { border-color: var(--ok); color: var(--ok); }
.btn-bad { border-color: var(--bad); color: var(--bad); }
.danger { color: var(--bad); }
.muted { color: var(--muted); font-size: .9rem; }
.input { width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--border);
  background: var(--card); color: var(--text); font-size: 1rem; }
.bar { display: flex; height: 10px; border-radius: 5px; overflow: hidden; background: var(--lv0); }
.bar-seg { height: 100%; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: .8rem; background: var(--lv0); }
.lv0 { background: var(--lv0); } .lv1 { background: var(--lv1); } .lv2 { background: var(--lv2); } .lv3 { background: var(--lv3); }
.stale { opacity: .55; }
.center { text-align: center; }
.big { font-size: 2rem; font-weight: 700; }
.tree-core { text-align: center; padding: 16px; border: 2px solid var(--primary); border-radius: var(--radius); }
.tree-branches { display: grid; grid-template-columns: 1fr; gap: 10px; margin-top: 10px; padding-left: 14px;
  border-left: 3px solid var(--primary); }
@media (min-width: 600px) { .tree-branches { grid-template-columns: 1fr 1fr; } }
.branch { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 12px; }
.branch .bridge { color: var(--primary); font-size: .85rem; }
.branch .example { font-style: italic; margin-top: 6px; }
.option { text-align: left; }
.option.correct { border-color: var(--ok); background: color-mix(in srgb, var(--ok) 15%, var(--card)); }
.option.wrong { border-color: var(--bad); background: color-mix(in srgb, var(--bad) 15%, var(--card)); }
.topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.topbar a { color: var(--muted); text-decoration: none; }
```

`src/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('indexeddb is available in tests', () => {
    expect(typeof indexedDB).toBe('object')
  })
})
```

- [ ] **Step 2: 의존성 설치**

Run:
```bash
npm install react react-dom react-router dexie zod
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event fake-indexeddb vite-plugin-pwa tsx
```
Expected: `node_modules/` 생성, package.json에 dependencies 기록.

- [ ] **Step 3: 테스트·빌드 확인**

Run: `npm test -- --run`
Expected: `smoke` 1 passed.

Run: `npm run build`
Expected: `dist/index.html` 생성, 오류 없음.

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "chore: Vite + React + TS 스캐폴드, Vitest 설정"
```

---

### Task 2: 콘텐츠 스키마, 빈칸 정답 추출, 검증, 샘플 뱅크

**Files:**
- Create: `src/content/schema.ts`, `src/content/blank.ts`, `src/content/validate.ts`, `src/content/loadBank.ts`, `scripts/validate.ts`, `public/content/index.json`, `public/content/banks/sample.json`
- Test: `src/content/blank.test.ts`, `src/content/validate.test.ts`

**Interfaces:**
- Produces:
  - `type Sense = { ko; en; bridge; example; blank }`, `type Word = { id; no; source; word; pos; ipa; core:{ko;en}; senses: Sense[]; koGenerated; image: string|null; etymology: string|null }`, `type Bank = { id; title; words: Word[] }`, `type BankIndex = { banks: { id; title; file; wordCount }[] }`
  - `BankSchema`, `BankIndexSchema`, `WordSchema`, `NewWordSchema`(= WordSchema without `no`)
  - `blankAnswer(sense: Sense): string` — 빈칸에 들어갈 실제 형태(`runs`), 추출 불가면 `''`
  - `validateBank(data: unknown): string[]` — 오류 메시지 목록, 비어 있으면 정상
  - `loadIndex(): Promise<BankIndex>`, `loadBank(file: string): Promise<Bank>`, `class BankLoadError extends Error`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/content/blank.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { blankAnswer } from './blank'

const sense = (example: string, blank: string) => ({ ko: 'x', en: 'x', bridge: '', example, blank })

describe('blankAnswer', () => {
  it('extracts the inflected form', () => {
    expect(blankAnswer(sense('She runs every morning.', 'She ____ every morning.'))).toBe('runs')
  })
  it('works when blank is at the end', () => {
    expect(blankAnswer(sense('The match ended in a draw.', 'The match ended in a ____.'))).toBe('draw')
  })
  it('returns empty string when example and blank do not line up', () => {
    expect(blankAnswer(sense('She runs fast.', 'He ____ fast.'))).toBe('')
  })
})
```

`src/content/validate.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { validateBank } from './validate'

const word = (id: string, no: number, extra: Partial<Record<string, unknown>> = {}) => ({
  id, no, source: 'Day 1', word: id, pos: 'v.', ipa: '',
  core: { ko: '핵심', en: 'core' },
  senses: [{ ko: '뜻', en: 'meaning', bridge: '', example: `I ${id} now.`, blank: 'I ____ now.' }],
  ...extra,
})
const bank = (words: unknown[]) => ({ id: 'b', title: 'B', words })

describe('validateBank', () => {
  it('accepts a valid bank', () => {
    expect(validateBank(bank([word('run', 1), word('fine', 2)]))).toEqual([])
  })
  it('reports schema errors', () => {
    const errors = validateBank(bank([word('run', 1, { senses: [] })]))
    expect(errors.some((e) => e.includes('senses'))).toBe(true)
  })
  it('reports duplicate ids', () => {
    expect(validateBank(bank([word('run', 1), word('run', 2)]))).toContain('중복 id: run')
  })
  it('reports non-consecutive numbers', () => {
    expect(validateBank(bank([word('run', 1), word('fine', 3)]))).toContain('번호가 연속이 아님: 2 다음이 3 (fine)')
  })
  it('reports a blank that does not match its example', () => {
    const w = word('run', 1)
    w.senses[0].blank = 'You ____ now.'
    expect(validateBank(bank([w]))).toContain('빈칸이 예문과 맞지 않음: run #1')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- --run src/content`
Expected: FAIL, `Cannot find module './blank'`, `'./validate'`.

- [ ] **Step 3: 구현**

`src/content/schema.ts`:
```ts
import { z } from 'zod'

export const SenseSchema = z.object({
  ko: z.string().min(1),
  en: z.string().min(1),
  bridge: z.string(),
  example: z.string().min(1),
  blank: z.string().refine((s) => s.includes('____'), { message: 'blank에 ____ 가 없음' }),
})

export const WordSchema = z.object({
  id: z.string().min(1),
  no: z.number().int().positive(),
  source: z.string(),
  word: z.string().min(1),
  pos: z.string(),
  ipa: z.string(),
  core: z.object({ ko: z.string().min(1), en: z.string().min(1) }),
  senses: z.array(SenseSchema).min(1),
  koGenerated: z.boolean().default(false),
  image: z.string().nullable().default(null),
  etymology: z.string().nullable().default(null),
})

export const NewWordSchema = WordSchema.omit({ no: true })

export const BankSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  words: z.array(WordSchema).min(1),
})

export const BankIndexEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  file: z.string().min(1),
  wordCount: z.number().int().nonnegative(),
})
export const BankIndexSchema = z.object({ banks: z.array(BankIndexEntrySchema) })

export type Sense = z.infer<typeof SenseSchema>
export type Word = z.infer<typeof WordSchema>
export type NewWord = z.infer<typeof NewWordSchema>
export type Bank = z.infer<typeof BankSchema>
export type BankIndexEntry = z.infer<typeof BankIndexEntrySchema>
export type BankIndex = z.infer<typeof BankIndexSchema>
```

`src/content/blank.ts`:
```ts
import type { Sense } from './schema'

export const BLANK = '____'

/** example와 blank의 공통 앞뒤를 제거해 빈칸에 들어갈 실제 형태를 돌려준다. 못 찾으면 ''. */
export function blankAnswer(sense: Pick<Sense, 'example' | 'blank'>): string {
  const i = sense.blank.indexOf(BLANK)
  if (i < 0) return ''
  const prefix = sense.blank.slice(0, i)
  const suffix = sense.blank.slice(i + BLANK.length)
  const { example } = sense
  if (!example.startsWith(prefix) || !example.endsWith(suffix)) return ''
  const answer = example.slice(prefix.length, example.length - suffix.length)
  return answer.trim()
}
```

`src/content/validate.ts`:
```ts
import { BankSchema } from './schema'
import { blankAnswer } from './blank'

export function validateBank(data: unknown): string[] {
  const parsed = BankSchema.safeParse(data)
  if (!parsed.success) {
    return parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
  }
  const errors: string[] = []
  const seen = new Set<string>()
  const sorted = [...parsed.data.words].sort((a, b) => a.no - b.no)
  let prev = 0
  for (const w of sorted) {
    if (seen.has(w.id)) errors.push(`중복 id: ${w.id}`)
    seen.add(w.id)
    if (w.no !== prev + 1) errors.push(`번호가 연속이 아님: ${prev} 다음이 ${w.no} (${w.id})`)
    prev = w.no
    w.senses.forEach((s, idx) => {
      if (blankAnswer(s) === '') errors.push(`빈칸이 예문과 맞지 않음: ${w.id} #${idx + 1}`)
    })
  }
  return errors
}
```

`src/content/loadBank.ts`:
```ts
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
  const res = await fetch(base() + path, { cache: 'no-cache' })
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
```

`scripts/validate.ts`:
```ts
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
```

`public/content/index.json`:
```json
{
  "banks": [
    { "id": "sample", "title": "샘플 단어장", "file": "banks/sample.json", "wordCount": 10 }
  ]
}
```

`public/content/banks/sample.json` (전문):
```json
{
  "id": "sample",
  "title": "샘플 단어장",
  "words": [
    {
      "id": "run", "no": 1, "source": "Day 1", "word": "run", "pos": "v.", "ipa": "/rʌn/",
      "core": { "ko": "끊김 없이 쭉 흘러가다", "en": "to keep going without stopping" },
      "senses": [
        { "ko": "달리다", "en": "to move fast on foot", "bridge": "사람이 쭉 가면", "example": "She runs every morning before school.", "blank": "She ____ every morning before school." },
        { "ko": "운영하다", "en": "to be in charge of a business", "bridge": "가게가 쭉 굴러가면", "example": "My uncle runs a small bakery.", "blank": "My uncle ____ a small bakery." },
        { "ko": "흐르다", "en": "to flow", "bridge": "물이 쭉 가면", "example": "Tears ran down his face.", "blank": "Tears ____ down his face." },
        { "ko": "작동하다", "en": "to work, for a machine", "bridge": "기계가 쭉 돌아가면", "example": "The engine won't run in cold weather.", "blank": "The engine won't ____ in cold weather." }
      ],
      "koGenerated": false, "image": null, "etymology": null
    },
    {
      "id": "fine", "no": 2, "source": "Day 1", "word": "fine", "pos": "adj., n.", "ipa": "/faɪn/",
      "core": { "ko": "흠 없이 곱게 다듬어진 것", "en": "finished so well that nothing is wrong" },
      "senses": [
        { "ko": "좋은", "en": "good or healthy", "bridge": "흠이 없으면 좋은 것", "example": "I feel fine today.", "blank": "I feel ____ today." },
        { "ko": "가는", "en": "very thin or small", "bridge": "곱게 다듬으면 가늘어짐", "example": "Use a fine brush for the details.", "blank": "Use a ____ brush for the details." },
        { "ko": "벌금", "en": "money you pay for breaking a rule", "bridge": "다른 뿌리: '끝내다'에서", "example": "I paid a fine for parking there.", "blank": "I paid a ____ for parking there." }
      ],
      "koGenerated": false, "image": null,
      "etymology": "'좋은·가는'은 라틴어 finus(완성된)에서, '벌금'은 finis(끝)에서 왔어요. 벌금을 내면 그 일이 끝난다는 뜻이에요."
    },
    {
      "id": "charge", "no": 3, "source": "Day 1", "word": "charge", "pos": "v., n.", "ipa": "/tʃɑːrdʒ/",
      "core": { "ko": "무언가를 싣다", "en": "to load something onto" },
      "senses": [
        { "ko": "청구하다", "en": "to ask someone to pay money", "bridge": "돈 부담을 싣다", "example": "The hotel charged us for breakfast.", "blank": "The hotel ____ us for breakfast." },
        { "ko": "충전하다", "en": "to put electricity into something", "bridge": "전기를 싣다", "example": "I need to charge my phone.", "blank": "I need to ____ my phone." },
        { "ko": "책임", "en": "the job of being in control", "bridge": "책임을 싣다", "example": "Who is in charge of this project?", "blank": "Who is in ____ of this project?" }
      ],
      "koGenerated": false, "image": null, "etymology": null
    },
    {
      "id": "light", "no": 4, "source": "Day 1", "word": "light", "pos": "n., adj.", "ipa": "/laɪt/",
      "core": { "ko": "빛", "en": "the brightness that lets us see" },
      "senses": [
        { "ko": "빛", "en": "brightness from the sun or a lamp", "bridge": "그대로 빛", "example": "Turn on the light, please.", "blank": "Turn on the ____, please." },
        { "ko": "밝은", "en": "full of light, not dark", "bridge": "빛이 많으면 밝은", "example": "The room is light and airy.", "blank": "The room is ____ and airy." },
        { "ko": "가벼운", "en": "not heavy", "bridge": "다른 뿌리: 철자만 같아짐", "example": "This bag is light enough to carry.", "blank": "This bag is ____ enough to carry." }
      ],
      "koGenerated": false, "image": null,
      "etymology": "'빛'과 '가벼운'은 원래 다른 단어였는데 세월이 지나 철자가 같아졌어요."
    },
    {
      "id": "draw", "no": 5, "source": "Day 1", "word": "draw", "pos": "v., n.", "ipa": "/drɔː/",
      "core": { "ko": "끌어당기다", "en": "to pull toward you" },
      "senses": [
        { "ko": "그리다", "en": "to make a picture with a pen or pencil", "bridge": "펜을 끌어 선을 만들면", "example": "She draws cartoons in class.", "blank": "She ____ cartoons in class." },
        { "ko": "끌다", "en": "to attract people or attention", "bridge": "사람을 끌어당기면", "example": "The festival drew a huge crowd.", "blank": "The festival ____ a huge crowd." },
        { "ko": "무승부", "en": "a game that nobody wins", "bridge": "양쪽이 똑같이 당겨 안 움직이면", "example": "The match ended in a draw.", "blank": "The match ended in a ____." }
      ],
      "koGenerated": false, "image": null, "etymology": null
    },
    {
      "id": "match", "no": 6, "source": "Day 2", "word": "match", "pos": "n., v.", "ipa": "/mætʃ/",
      "core": { "ko": "서로 맞는 짝", "en": "two things that go together" },
      "senses": [
        { "ko": "경기", "en": "a game between two teams", "bridge": "짝지어 겨루면", "example": "We watched a soccer match.", "blank": "We watched a soccer ____." },
        { "ko": "어울리다", "en": "to look good together", "bridge": "짝이 잘 맞으면", "example": "Your shoes match your bag.", "blank": "Your shoes ____ your bag." },
        { "ko": "성냥", "en": "a small stick that makes fire", "bridge": "다른 뿌리: 심지에서", "example": "He lit the candle with a match.", "blank": "He lit the candle with a ____." }
      ],
      "koGenerated": false, "image": null,
      "etymology": "'짝'은 고대 영어 gemæcca, '성냥'은 그리스어 myxa(심지)에서 왔어요."
    },
    {
      "id": "mean", "no": 7, "source": "Day 2", "word": "mean", "pos": "v., adj., n.", "ipa": "/miːn/",
      "core": { "ko": "마음에 두다", "en": "to have something in mind" },
      "senses": [
        { "ko": "의미하다", "en": "to have a meaning", "bridge": "마음에 둔 뜻을 말하면", "example": "What does this word mean?", "blank": "What does this word ____?" },
        { "ko": "못된", "en": "unkind", "bridge": "다른 뿌리: '평범한, 낮은'에서", "example": "Don't be mean to your sister.", "blank": "Don't be ____ to your sister." },
        { "ko": "평균", "en": "the number in the middle, the average", "bridge": "다른 뿌리: 라틴어 medius(가운데)", "example": "The mean of 2, 4 and 6 is 4.", "blank": "The ____ of 2, 4 and 6 is 4." }
      ],
      "koGenerated": false, "image": null,
      "etymology": "세 뜻이 각각 다른 뿌리예요. 수학의 '평균'은 medius(가운데)에서 왔어요."
    },
    {
      "id": "fair", "no": 8, "source": "Day 2", "word": "fair", "pos": "adj., n.", "ipa": "/fer/",
      "core": { "ko": "보기 좋고 고른 것", "en": "pleasing and even" },
      "senses": [
        { "ko": "공정한", "en": "treating everyone the same", "bridge": "고르게 대하면", "example": "The referee was fair to both teams.", "blank": "The referee was ____ to both teams." },
        { "ko": "금발의", "en": "light in color, for hair or skin", "bridge": "보기 좋은 밝은 색", "example": "She has fair hair.", "blank": "She has ____ hair." },
        { "ko": "박람회", "en": "a big event with shows and games", "bridge": "다른 뿌리: 라틴어 feria(축제일)", "example": "We went to the science fair.", "blank": "We went to the science ____." }
      ],
      "koGenerated": false, "image": null, "etymology": null
    },
    {
      "id": "bank", "no": 9, "source": "Day 2", "word": "bank", "pos": "n.", "ipa": "/bæŋk/",
      "core": { "ko": "쌓아 올린 둔덕", "en": "a raised pile of something" },
      "senses": [
        { "ko": "은행", "en": "a place that keeps money safe", "bridge": "돈을 쌓아 두는 곳", "example": "I put my money in the bank.", "blank": "I put my money in the ____." },
        { "ko": "강둑", "en": "the land along a river", "bridge": "강가에 쌓인 흙", "example": "We sat on the river bank.", "blank": "We sat on the river ____." }
      ],
      "koGenerated": false, "image": null, "etymology": null
    },
    {
      "id": "right", "no": 10, "source": "Day 2", "word": "right", "pos": "adj., n.", "ipa": "/raɪt/",
      "core": { "ko": "똑바른 것", "en": "straight, not bent" },
      "senses": [
        { "ko": "옳은", "en": "correct", "bridge": "똑바르면 옳은 것", "example": "You got the right answer.", "blank": "You got the ____ answer." },
        { "ko": "오른쪽", "en": "the side opposite the left", "bridge": "똑바로 뻗는 손 쪽", "example": "Turn right at the corner.", "blank": "Turn ____ at the corner." },
        { "ko": "권리", "en": "something you are allowed to have or do", "bridge": "옳게 주어진 것", "example": "Everyone has the right to learn.", "blank": "Everyone has the ____ to learn." }
      ],
      "koGenerated": false, "image": null, "etymology": null
    }
  ]
}
```

- [ ] **Step 4: 테스트·검증 통과 확인**

Run: `npm test -- --run src/content`
Expected: 8 passed.

Run: `npm run validate`
Expected: `✓ banks/sample.json (10단어)`, exit 0.

- [ ] **Step 5: 커밋**

```bash
git add src/content scripts/validate.ts public/content
git commit -m "feat: 뱅크 스키마·검증·샘플 단어장 10개"
```

---

### Task 3: 레벨 규칙 (`src/study/level.ts`)

**Files:**
- Create: `src/study/level.ts`
- Test: `src/study/level.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type GradedMode = 'blank' | 'pick' | 'match' | 'mock'
  type Mode = 'tree' | 'sentence' | GradedMode
  type Level = 0 | 1 | 2 | 3
  interface WordState { id: string; level: Level; streak: number; lastStudiedAt: number | null;
    stats: Partial<Record<GradedMode, { correct: number; wrong: number }>> }
  const STALE_MS = 604800000
  initialState(id): WordState
  applyView(s, now): WordState
  applyAnswer(s, correct: boolean, mode: GradedMode, now): WordState
  isStale(s, now): boolean
  weight(s, now): number
  ```

- [ ] **Step 1: 실패하는 테스트 작성**

`src/study/level.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { initialState, applyView, applyAnswer, isStale, weight, STALE_MS } from './level'

const T = 1_700_000_000_000

describe('level', () => {
  it('starts at level 0 with no history', () => {
    expect(initialState('run')).toEqual({ id: 'run', level: 0, streak: 0, lastStudiedAt: null, stats: {} })
  })
  it('viewing raises level to at least 1 and stamps time', () => {
    const s = applyView(initialState('run'), T)
    expect(s.level).toBe(1)
    expect(s.lastStudiedAt).toBe(T)
    const s3 = applyView({ ...s, level: 3 }, T + 1)
    expect(s3.level).toBe(3)
  })
  it('two correct answers in a row raise the level by one and reset streak', () => {
    let s = initialState('run')
    s = applyAnswer(s, true, 'blank', T)
    expect(s.level).toBe(0)
    expect(s.streak).toBe(1)
    s = applyAnswer(s, true, 'blank', T + 1)
    expect(s.level).toBe(1)
    expect(s.streak).toBe(0)
    expect(s.stats.blank).toEqual({ correct: 2, wrong: 0 })
  })
  it('level never exceeds 3', () => {
    let s = { ...initialState('run'), level: 3 as const, streak: 1 }
    s = applyAnswer(s, true, 'pick', T)
    expect(s.level).toBe(3)
  })
  it('a wrong answer drops to level 1, or stays 0', () => {
    const high = applyAnswer({ ...initialState('run'), level: 3, streak: 1 }, false, 'mock', T)
    expect(high.level).toBe(1)
    expect(high.streak).toBe(0)
    expect(high.stats.mock).toEqual({ correct: 0, wrong: 1 })
    const zero = applyAnswer(initialState('run'), false, 'mock', T)
    expect(zero.level).toBe(0)
  })
  it('is stale after 7 days without study, never stale if never studied', () => {
    const s = applyView(initialState('run'), T)
    expect(isStale(s, T + STALE_MS - 1)).toBe(false)
    expect(isStale(s, T + STALE_MS)).toBe(true)
    expect(isStale(initialState('run'), T)).toBe(false)
  })
  it('weights by level and adds 2 when stale', () => {
    const base = { ...initialState('run'), lastStudiedAt: T }
    expect(weight({ ...base, level: 0 }, T)).toBe(4)
    expect(weight({ ...base, level: 1 }, T)).toBe(3)
    expect(weight({ ...base, level: 2 }, T)).toBe(2)
    expect(weight({ ...base, level: 3 }, T)).toBe(1)
    expect(weight({ ...base, level: 3 }, T + STALE_MS)).toBe(3)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- --run src/study/level`
Expected: FAIL, `Cannot find module './level'`.

- [ ] **Step 3: 구현**

`src/study/level.ts`:
```ts
export type GradedMode = 'blank' | 'pick' | 'match' | 'mock'
export type Mode = 'tree' | 'sentence' | GradedMode
export type Level = 0 | 1 | 2 | 3

export interface WordState {
  id: string
  level: Level
  streak: number
  lastStudiedAt: number | null
  stats: Partial<Record<GradedMode, { correct: number; wrong: number }>>
}

export const STALE_MS = 7 * 24 * 60 * 60 * 1000
const LEVEL_WEIGHT: Record<Level, number> = { 0: 4, 1: 3, 2: 2, 3: 1 }

export function initialState(id: string): WordState {
  return { id, level: 0, streak: 0, lastStudiedAt: null, stats: {} }
}

export function applyView(s: WordState, now: number): WordState {
  return { ...s, level: s.level < 1 ? 1 : s.level, lastStudiedAt: now }
}

export function applyAnswer(s: WordState, correct: boolean, mode: GradedMode, now: number): WordState {
  const prev = s.stats[mode] ?? { correct: 0, wrong: 0 }
  const stats = { ...s.stats, [mode]: { correct: prev.correct + (correct ? 1 : 0), wrong: prev.wrong + (correct ? 0 : 1) } }
  if (correct) {
    const streak = s.streak + 1
    if (streak >= 2) {
      return { ...s, level: Math.min(3, s.level + 1) as Level, streak: 0, lastStudiedAt: now, stats }
    }
    return { ...s, streak, lastStudiedAt: now, stats }
  }
  return { ...s, level: s.level === 0 ? 0 : 1, streak: 0, lastStudiedAt: now, stats }
}

export function isStale(s: WordState, now: number): boolean {
  return s.lastStudiedAt !== null && now - s.lastStudiedAt >= STALE_MS
}

export function weight(s: WordState, now: number): number {
  return LEVEL_WEIGHT[s.level] + (isStale(s, now) ? 2 : 0)
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- --run src/study/level`
Expected: 7 passed.

- [ ] **Step 5: 커밋**

```bash
git add src/study/level.ts src/study/level.test.ts
git commit -m "feat: 단어 레벨 규칙 (열람·정답·오답·흐려짐·가중치)"
```

---

### Task 4: 출제 (`src/study/picker.ts`)

**Files:**
- Create: `src/study/picker.ts`
- Test: `src/study/picker.test.ts`

**Interfaces:**
- Consumes: `Word`, `Sense`(Task 2), `WordState`, `weight`(Task 3), `blankAnswer`(Task 2)
- Produces:
  ```ts
  type Rng = () => number
  interface BlankQuestion { kind: 'blank'; wordId: string; senseIndex: number; prompt: string; answer: string; accept: string[]; options: string[]; explain: string }
  interface PickQuestion { kind: 'pick'; wordId: string; senseIndex: number; sentence: string; answer: string; options: string[]; explain: string }
  type Question = BlankQuestion | PickQuestion
  shuffle<T>(arr: T[], rng: Rng): T[]
  pickWords(words: Word[], states: Map<string, WordState>, count: number, now: number, rng: Rng): Word[]
  chooseSenseIndex(word: Word, rng: Rng): number
  buildBlankQuestion(word: Word, senseIndex: number, pool: Word[], rng: Rng): BlankQuestion
  buildPickQuestion(word: Word, senseIndex: number, pool: Word[], rng: Rng): PickQuestion
  buildRound(kind: 'blank' | 'pick', rangeWords: Word[], bankWords: Word[], states: Map<string, WordState>, now: number, rng: Rng): Question[]
  const ROUND_SIZE = 10
  ```
- `prompt`는 `sense.blank`, `answer`는 `word.word`, `accept`는 소문자 `[word.word, blankAnswer(sense)]`(중복 제거), `explain`은 `sense.en`.
- 뜻 고르기 보기는 같은 단어의 다른 뜻을 먼저 넣고, 모자라면 pool의 다른 단어 뜻으로 채워 최대 4개.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/study/picker.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { pickWords, buildBlankQuestion, buildPickQuestion, buildRound, shuffle } from './picker'
import { initialState, type WordState } from './level'
import type { Word } from '../content/schema'

const mk = (id: string, no: number, kos: string[]): Word => ({
  id, no, source: 'Day 1', word: id, pos: '', ipa: '', core: { ko: 'c', en: 'c' },
  senses: kos.map((ko, i) => ({ ko, en: `${id} meaning ${i}`, bridge: '', example: `I ${id}${i} it.`, blank: 'I ____ it.' })),
  koGenerated: false, image: null, etymology: null,
})
const words = [mk('run', 1, ['달리다', '운영하다', '흐르다', '작동하다']), mk('fine', 2, ['좋은', '벌금']),
  mk('charge', 3, ['청구하다']), mk('draw', 4, ['그리다']), mk('bank', 5, ['은행'])]
const states = (lv: Record<string, 0 | 1 | 2 | 3>) =>
  new Map<string, WordState>(words.map((w) => [w.id, { ...initialState(w.id), level: lv[w.id] ?? 0 }]))
const seq = (vals: number[]) => { let i = 0; return () => vals[i++ % vals.length] }

describe('shuffle', () => {
  it('returns a permutation without mutating input', () => {
    const arr = [1, 2, 3, 4]
    const out = shuffle(arr, seq([0.9, 0.1, 0.5]))
    expect(out.sort()).toEqual([1, 2, 3, 4])
    expect(arr).toEqual([1, 2, 3, 4])
  })
})

describe('pickWords', () => {
  it('returns at most count distinct words', () => {
    const out = pickWords(words, states({}), 3, 0, Math.random)
    expect(out).toHaveLength(3)
    expect(new Set(out.map((w) => w.id)).size).toBe(3)
  })
  it('returns all words when count exceeds length', () => {
    expect(pickWords(words, states({}), 10, 0, Math.random)).toHaveLength(5)
  })
  it('prefers low-level words', () => {
    const st = states({ run: 3, fine: 3, charge: 3, draw: 3, bank: 0 })
    let bankFirst = 0
    for (let i = 0; i < 200; i++) if (pickWords(words, st, 1, 0, Math.random)[0].id === 'bank') bankFirst++
    expect(bankFirst).toBeGreaterThan(80)
  })
})

describe('buildBlankQuestion', () => {
  it('builds 4 options including the answer and accepts inflected form', () => {
    const q = buildBlankQuestion(words[0], 0, words, Math.random)
    expect(q.kind).toBe('blank')
    expect(q.options).toHaveLength(4)
    expect(q.options).toContain('run')
    expect(new Set(q.options).size).toBe(4)
    expect(q.prompt).toBe('I ____ it.')
    expect(q.accept).toEqual(['run', 'run0'])
    expect(q.explain).toBe('run meaning 0')
  })
  it('uses fewer options when the pool is small', () => {
    const q = buildBlankQuestion(words[0], 0, words.slice(0, 2), Math.random)
    expect(q.options.sort()).toEqual(['fine', 'run'])
  })
})

describe('buildPickQuestion', () => {
  it('uses the same word\'s other senses first', () => {
    const q = buildPickQuestion(words[0], 1, words, Math.random)
    expect(q.answer).toBe('운영하다')
    expect(q.options.sort()).toEqual(['달리다', '운영하다', '작동하다', '흐르다'])
    expect(q.sentence).toBe('I run1 it.')
  })
  it('fills from other words when the word has few senses', () => {
    const q = buildPickQuestion(words[2], 0, words, Math.random)
    expect(q.options).toHaveLength(4)
    expect(q.options).toContain('청구하다')
  })
})

describe('buildRound', () => {
  it('makes ROUND_SIZE questions with distinct words, falling back to bank pool when range is small', () => {
    const range = words.slice(0, 2)
    const round = buildRound('blank', range, words, states({}), 0, Math.random)
    expect(round).toHaveLength(2)
    expect(round.every((q) => q.options.length === 4)).toBe(true)
    const ten = Array.from({ length: 12 }, (_, i) => mk(`w${i}`, i + 1, ['뜻']))
    const big = buildRound('pick', ten, ten, new Map(), 0, Math.random)
    expect(big).toHaveLength(10)
    expect(new Set(big.map((q) => q.wordId)).size).toBe(10)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- --run src/study/picker`
Expected: FAIL, `Cannot find module './picker'`.

- [ ] **Step 3: 구현**

`src/study/picker.ts`:
```ts
import type { Word } from '../content/schema'
import { blankAnswer } from '../content/blank'
import { weight, type WordState, initialState } from './level'

export type Rng = () => number
export const ROUND_SIZE = 10
const OPTION_COUNT = 4

export interface BlankQuestion {
  kind: 'blank'; wordId: string; senseIndex: number
  prompt: string; answer: string; accept: string[]; options: string[]; explain: string
}
export interface PickQuestion {
  kind: 'pick'; wordId: string; senseIndex: number
  sentence: string; answer: string; options: string[]; explain: string
}
export type Question = BlankQuestion | PickQuestion

export function shuffle<T>(arr: T[], rng: Rng): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function pickWords(words: Word[], states: Map<string, WordState>, count: number, now: number, rng: Rng): Word[] {
  const remaining = words.map((w) => ({ w, wt: weight(states.get(w.id) ?? initialState(w.id), now) }))
  const out: Word[] = []
  while (out.length < count && remaining.length) {
    const total = remaining.reduce((s, r) => s + r.wt, 0)
    let r = rng() * total
    let idx = remaining.length - 1
    for (let i = 0; i < remaining.length; i++) {
      r -= remaining[i].wt
      if (r < 0) { idx = i; break }
    }
    out.push(remaining[idx].w)
    remaining.splice(idx, 1)
  }
  return out
}

export function chooseSenseIndex(word: Word, rng: Rng): number {
  return Math.floor(rng() * word.senses.length)
}

function takeDistinct(candidates: string[], exclude: Set<string>, n: number, rng: Rng): string[] {
  const uniq = [...new Set(candidates)].filter((c) => !exclude.has(c))
  return shuffle(uniq, rng).slice(0, n)
}

export function buildBlankQuestion(word: Word, senseIndex: number, pool: Word[], rng: Rng): BlankQuestion {
  const sense = word.senses[senseIndex]
  const distractors = takeDistinct(pool.filter((w) => w.id !== word.id).map((w) => w.word), new Set([word.word]), OPTION_COUNT - 1, rng)
  const accept = [...new Set([word.word.toLowerCase(), blankAnswer(sense).toLowerCase()].filter(Boolean))]
  return {
    kind: 'blank', wordId: word.id, senseIndex, prompt: sense.blank, answer: word.word, accept,
    options: shuffle([word.word, ...distractors], rng), explain: sense.en,
  }
}

export function buildPickQuestion(word: Word, senseIndex: number, pool: Word[], rng: Rng): PickQuestion {
  const sense = word.senses[senseIndex]
  const own = takeDistinct(word.senses.filter((_, i) => i !== senseIndex).map((s) => s.ko), new Set([sense.ko]), OPTION_COUNT - 1, rng)
  const others = pool.filter((w) => w.id !== word.id).flatMap((w) => w.senses.map((s) => s.ko))
  const fill = takeDistinct(others, new Set([sense.ko, ...own]), OPTION_COUNT - 1 - own.length, rng)
  return {
    kind: 'pick', wordId: word.id, senseIndex, sentence: sense.example, answer: sense.ko,
    options: shuffle([sense.ko, ...own, ...fill], rng), explain: sense.en,
  }
}

export function buildRound(kind: 'blank' | 'pick', rangeWords: Word[], bankWords: Word[],
  states: Map<string, WordState>, now: number, rng: Rng): Question[] {
  const pool = rangeWords.length >= OPTION_COUNT ? rangeWords : bankWords
  return pickWords(rangeWords, states, ROUND_SIZE, now, rng).map((w) => {
    const si = chooseSenseIndex(w, rng)
    return kind === 'blank' ? buildBlankQuestion(w, si, pool, rng) : buildPickQuestion(w, si, pool, rng)
  })
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- --run src/study/picker`
Expected: 9 passed.

- [ ] **Step 5: 커밋**

```bash
git add src/study/picker.ts src/study/picker.test.ts
git commit -m "feat: 가중치 출제와 빈칸·뜻 고르기 문제 생성"
```

---

### Task 5: 채점 (`src/study/grading.ts`)

**Files:**
- Create: `src/study/grading.ts`
- Test: `src/study/grading.test.ts`

**Interfaces:**
- Consumes: `Word`(Task 2), `BlankQuestion`(Task 4)
- Produces:
  ```ts
  normalizeKo(s: string): string   // 괄호 안 제거, 공백·구두점 제거
  normalizeEn(s: string): string   // trim, 소문자, 공백 하나로
  gradeBlankInput(q: BlankQuestion, input: string): boolean
  interface MockWordResult { wordId: string; matched: number; total: number; missed: string[] }
  gradeMockWord(word: Word, answers: string[]): MockWordResult
  gradeMockExam(words: Word[], answers: Record<string, string[]>): { score: number; results: MockWordResult[] }
  ```

- [ ] **Step 1: 실패하는 테스트 작성**

`src/study/grading.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { normalizeKo, normalizeEn, gradeBlankInput, gradeMockWord, gradeMockExam } from './grading'
import type { Word } from '../content/schema'
import type { BlankQuestion } from './picker'

const mk = (id: string, kos: string[]): Word => ({
  id, no: 1, source: '', word: id, pos: '', ipa: '', core: { ko: '', en: '' },
  senses: kos.map((ko) => ({ ko, en: 'e', bridge: '', example: `a ${id} b`, blank: 'a ____ b' })),
  koGenerated: false, image: null, etymology: null,
})

describe('normalizeKo', () => {
  it('strips parentheses, spaces and punctuation', () => {
    expect(normalizeKo('(가게를) 운영하다')).toBe('운영하다')
    expect(normalizeKo('  달리다. ')).toBe('달리다')
    expect(normalizeKo('요금을 청구하다')).toBe('요금을청구하다')
    expect(normalizeKo('')).toBe('')
  })
})

describe('normalizeEn', () => {
  it('lowercases and trims', () => {
    expect(normalizeEn('  Runs ')).toBe('runs')
  })
})

describe('gradeBlankInput', () => {
  const q: BlankQuestion = { kind: 'blank', wordId: 'run', senseIndex: 0, prompt: '', answer: 'run',
    accept: ['run', 'runs'], options: [], explain: '' }
  it('accepts base or inflected form, case-insensitive', () => {
    expect(gradeBlankInput(q, 'Run')).toBe(true)
    expect(gradeBlankInput(q, ' runs')).toBe(true)
    expect(gradeBlankInput(q, 'ran')).toBe(false)
    expect(gradeBlankInput(q, '')).toBe(false)
  })
})

describe('gradeMockWord', () => {
  const run = mk('run', ['달리다', '(가게를) 운영하다', '흐르다'])
  it('counts matches regardless of order and reports missed meanings', () => {
    const r = gradeMockWord(run, ['흐르다', '운영하다', ''])
    expect(r).toEqual({ wordId: 'run', matched: 2, total: 3, missed: ['달리다'] })
  })
  it('does not count the same meaning twice', () => {
    expect(gradeMockWord(run, ['달리다', '달리다', '달리다']).matched).toBe(1)
  })
})

describe('gradeMockExam', () => {
  it('scores 100 when everything matches and rounds otherwise', () => {
    const words = [mk('run', ['달리다', '흐르다']), mk('bank', ['은행'])]
    expect(gradeMockExam(words, { run: ['달리다', '흐르다'], bank: ['은행'] }).score).toBe(100)
    const half = gradeMockExam(words, { run: ['달리다'], bank: [] })
    expect(half.score).toBe(25)
    expect(half.results[1].missed).toEqual(['은행'])
  })
  it('treats missing answers as empty', () => {
    expect(gradeMockExam([mk('bank', ['은행'])], {}).score).toBe(0)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- --run src/study/grading`
Expected: FAIL, `Cannot find module './grading'`.

- [ ] **Step 3: 구현**

`src/study/grading.ts`:
```ts
import type { Word } from '../content/schema'
import type { BlankQuestion } from './picker'

export function normalizeKo(s: string): string {
  return s.replace(/\([^)]*\)/g, '').replace(/[\s.,;:!?'"·~\-_/]/g, '')
}

export function normalizeEn(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function gradeBlankInput(q: BlankQuestion, input: string): boolean {
  const n = normalizeEn(input)
  return n.length > 0 && q.accept.includes(n)
}

export interface MockWordResult { wordId: string; matched: number; total: number; missed: string[] }

export function gradeMockWord(word: Word, answers: string[]): MockWordResult {
  const given = new Set(answers.map(normalizeKo).filter(Boolean))
  const missed = word.senses.filter((s) => !given.has(normalizeKo(s.ko))).map((s) => s.ko)
  return { wordId: word.id, matched: word.senses.length - missed.length, total: word.senses.length, missed }
}

export function gradeMockExam(words: Word[], answers: Record<string, string[]>) {
  const results = words.map((w) => gradeMockWord(w, answers[w.id] ?? []))
  const sum = results.reduce((s, r) => s + r.matched / r.total, 0)
  const score = words.length ? Math.round((sum / words.length) * 100) : 0
  return { score, results }
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- --run src/study/grading`
Expected: 7 passed.

- [ ] **Step 5: 커밋**

```bash
git add src/study/grading.ts src/study/grading.test.ts
git commit -m "feat: 빈칸 입력·모의시험 채점"
```

---

### Task 6: Dexie 저장소와 진도 (`src/store/db.ts`, `src/store/progress.ts`)

**Files:**
- Create: `src/store/db.ts`, `src/store/progress.ts`
- Test: `src/store/progress.test.ts`

**Interfaces:**
- Consumes: `WordState`, `GradedMode`, `applyView`, `applyAnswer`, `initialState`(Task 3)
- Produces:
  ```ts
  // db.ts
  interface RangeRecord { id?: number; name: string; bankId: string; from: number; to: number; createdAt: number; mockBest: number | null; academyScore: number | null }
  interface SessionRecord { id?: number; mode: GradedMode; rangeId: number; at: number; correct: number; total: number }
  interface SentenceRecord { id?: number; wordId: string; senseIndex: number; text: string; at: number }
  interface BadgeRecord { id: string; at: number }
  interface SettingRecord { key: string; value: unknown }
  const db: Dexie & { wordState, mySentences, ranges, sessions, badges, settings }
  dayKey(ts: number): string   // 로컬 'YYYY-MM-DD'
  // progress.ts
  getStates(ids: string[]): Promise<Map<string, WordState>>   // 없는 id는 initialState로 채움
  recordView(id: string, now?: number): Promise<void>
  recordAnswer(id: string, correct: boolean, mode: GradedMode, now?: number): Promise<WordState>
  recordSession(s: Omit<SessionRecord, 'id'>): Promise<void>
  getStreak(now?: number): Promise<number>
  getTodayCount(now?: number): Promise<number>   // 오늘 푼 문제 수 = sessions.total 합
  resetProgress(): Promise<void>                  // 모든 테이블 비움
  ```

- [ ] **Step 1: 실패하는 테스트 작성**

`src/store/progress.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db, dayKey } from './db'
import { getStates, recordView, recordAnswer, recordSession, getStreak, getTodayCount, resetProgress } from './progress'

const DAY = 24 * 60 * 60 * 1000
// 2024-01-10 12:00 로컬 정오. 자정 경계 문제를 피한다.
const NOON = new Date(2024, 0, 10, 12, 0, 0).getTime()
const session = (at: number, total = 10) => ({ mode: 'blank' as const, rangeId: 1, at, correct: 5, total })

beforeEach(async () => { await resetProgress() })

describe('dayKey', () => {
  it('formats local date', () => {
    expect(dayKey(NOON)).toBe('2024-01-10')
  })
})

describe('states', () => {
  it('fills missing ids with initial state', async () => {
    const m = await getStates(['run', 'fine'])
    expect(m.get('run')?.level).toBe(0)
    expect(m.size).toBe(2)
  })
  it('persists views and answers', async () => {
    await recordView('run', NOON)
    const s = await recordAnswer('run', true, 'blank', NOON + 1)
    expect(s.streak).toBe(1)
    const m = await getStates(['run'])
    expect(m.get('run')).toEqual(s)
    expect(m.get('run')?.level).toBe(1)
  })
})

describe('streak', () => {
  it('is 0 with no sessions', async () => {
    expect(await getStreak(NOON)).toBe(0)
  })
  it('counts consecutive days ending today', async () => {
    await recordSession(session(NOON - 2 * DAY))
    await recordSession(session(NOON - DAY))
    await recordSession(session(NOON))
    expect(await getStreak(NOON)).toBe(3)
  })
  it('keeps the streak when yesterday was studied but today not yet', async () => {
    await recordSession(session(NOON - 2 * DAY))
    await recordSession(session(NOON - DAY))
    expect(await getStreak(NOON)).toBe(2)
  })
  it('resets after a skipped day', async () => {
    await recordSession(session(NOON - 3 * DAY))
    await recordSession(session(NOON - 2 * DAY))
    expect(await getStreak(NOON)).toBe(0)
  })
})

describe('today count', () => {
  it('sums totals of sessions today only', async () => {
    await recordSession(session(NOON - DAY, 10))
    await recordSession(session(NOON - 60_000, 10))
    await recordSession(session(NOON, 7))
    expect(await getTodayCount(NOON)).toBe(17)
  })
})

describe('reset', () => {
  it('clears everything', async () => {
    await recordView('run', NOON)
    await db.ranges.add({ name: 'r', bankId: 'b', from: 1, to: 2, createdAt: NOON, mockBest: null, academyScore: null })
    await resetProgress()
    expect(await db.wordState.count()).toBe(0)
    expect(await db.ranges.count()).toBe(0)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- --run src/store/progress`
Expected: FAIL, `Cannot find module './db'`.

- [ ] **Step 3: 구현**

`src/store/db.ts`:
```ts
import Dexie, { type EntityTable } from 'dexie'
import type { WordState, GradedMode } from '../study/level'

export interface RangeRecord {
  id?: number; name: string; bankId: string; from: number; to: number
  createdAt: number; mockBest: number | null; academyScore: number | null
}
export interface SessionRecord { id?: number; mode: GradedMode; rangeId: number; at: number; correct: number; total: number }
export interface SentenceRecord { id?: number; wordId: string; senseIndex: number; text: string; at: number }
export interface BadgeRecord { id: string; at: number }
export interface SettingRecord { key: string; value: unknown }

export const db = new Dexie('hajun-words') as Dexie & {
  wordState: EntityTable<WordState, 'id'>
  mySentences: EntityTable<SentenceRecord, 'id'>
  ranges: EntityTable<RangeRecord, 'id'>
  sessions: EntityTable<SessionRecord, 'id'>
  badges: EntityTable<BadgeRecord, 'id'>
  settings: EntityTable<SettingRecord, 'key'>
}

db.version(1).stores({
  wordState: 'id',
  mySentences: '++id, wordId',
  ranges: '++id, createdAt',
  sessions: '++id, at, rangeId',
  badges: 'id',
  settings: 'key',
})

export const ALL_TABLES = [db.wordState, db.mySentences, db.ranges, db.sessions, db.badges, db.settings] as const

export function dayKey(ts: number): string {
  const d = new Date(ts)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}
```

`src/store/progress.ts`:
```ts
import { db, dayKey, ALL_TABLES, type SessionRecord } from './db'
import { applyAnswer, applyView, initialState, type GradedMode, type WordState } from '../study/level'

const DAY = 24 * 60 * 60 * 1000

export async function getStates(ids: string[]): Promise<Map<string, WordState>> {
  const rows = await db.wordState.bulkGet(ids)
  return new Map(ids.map((id, i) => [id, rows[i] ?? initialState(id)]))
}

export async function recordView(id: string, now = Date.now()): Promise<void> {
  const cur = (await db.wordState.get(id)) ?? initialState(id)
  await db.wordState.put(applyView(cur, now))
}

export async function recordAnswer(id: string, correct: boolean, mode: GradedMode, now = Date.now()): Promise<WordState> {
  const cur = (await db.wordState.get(id)) ?? initialState(id)
  const next = applyAnswer(cur, correct, mode, now)
  await db.wordState.put(next)
  return next
}

export async function recordSession(s: Omit<SessionRecord, 'id'>): Promise<void> {
  await db.sessions.add(s as SessionRecord)
}

export async function getStreak(now = Date.now()): Promise<number> {
  const days = new Set((await db.sessions.toArray()).map((s) => dayKey(s.at)))
  let cursor = now
  if (!days.has(dayKey(cursor))) {
    cursor -= DAY
    if (!days.has(dayKey(cursor))) return 0
  }
  let streak = 0
  while (days.has(dayKey(cursor))) { streak++; cursor -= DAY }
  return streak
}

export async function getTodayCount(now = Date.now()): Promise<number> {
  const today = dayKey(now)
  const rows = await db.sessions.where('at').above(now - 2 * DAY).toArray()
  return rows.filter((s) => dayKey(s.at) === today).reduce((n, s) => n + s.total, 0)
}

export async function resetProgress(): Promise<void> {
  await db.transaction('rw', [...ALL_TABLES], async () => {
    for (const t of ALL_TABLES) await t.clear()
  })
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- --run src/store/progress`
Expected: 9 passed.

- [ ] **Step 5: 커밋**

```bash
git add src/store/db.ts src/store/progress.ts src/store/progress.test.ts
git commit -m "feat: Dexie 저장소와 진도 기록 (레벨·세션·출석)"
```

---

### Task 7: 범위 유틸, 범위 저장, 내보내기·가져오기

**Files:**
- Create: `src/content/range.ts`, `src/store/ranges.ts`, `src/store/exportImport.ts`
- Test: `src/content/range.test.ts`, `src/store/ranges.test.ts`, `src/store/exportImport.test.ts`

**Interfaces:**
- Consumes: `Bank`, `Word`(Task 2), `db`, `RangeRecord`, `ALL_TABLES`(Task 6)
- Produces:
  ```ts
  // content/range.ts (순수)
  interface DayGroup { label: string; from: number; to: number }
  daysOf(bank: Bank): DayGroup[]                    // source의 첫 라벨(", " 앞) 기준, 등장 순
  wordsInRange(bank: Bank, from: number, to: number): Word[]   // no 오름차순
  rangeName(bank: Bank, from: number, to: number, date: Date): string   // "10/15 Day 1~2" 또는 "10/15 단어 3~7"
  // store/ranges.ts
  createRange(input: { bankId: string; from: number; to: number; name: string }, now?: number): Promise<number>  // 생성 후 현재 범위로 설정
  listRanges(): Promise<RangeRecord[]>            // 최신순
  getCurrentRange(): Promise<RangeRecord | null>
  setCurrentRange(id: number): Promise<void>
  setAcademyScore(id: number, score: number | null): Promise<void>
  updateMockBest(id: number, score: number): Promise<void>   // 더 높을 때만 갱신
  getSetting<T>(key: string, fallback: T): Promise<T>
  setSetting(key: string, value: unknown): Promise<void>
  // store/exportImport.ts
  exportAll(): Promise<string>        // JSON 문자열 {version:1, exportedAt, wordState, mySentences, ranges, sessions, badges, settings}
  importAll(json: string): Promise<void>   // 형식 오류면 throw, 기존 데이터 유지. 정상이면 전체 교체
  ```

- [ ] **Step 1: 실패하는 테스트 작성**

`src/content/range.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { daysOf, wordsInRange, rangeName } from './range'
import type { Bank } from './schema'

const w = (id: string, no: number, source: string) => ({
  id, no, source, word: id, pos: '', ipa: '', core: { ko: '', en: '' },
  senses: [{ ko: 'k', en: 'e', bridge: '', example: 'a x b', blank: 'a ____ b' }],
  koGenerated: false, image: null, etymology: null,
})
const bank: Bank = { id: 'b', title: 'B', words: [w('a', 3, 'Day 2'), w('b', 1, 'Day 1'), w('c', 2, 'Day 1, Day 5'), w('d', 4, 'Day 2')] }

describe('daysOf', () => {
  it('groups by first source label in number order', () => {
    expect(daysOf(bank)).toEqual([{ label: 'Day 1', from: 1, to: 2 }, { label: 'Day 2', from: 3, to: 4 }])
  })
})
describe('wordsInRange', () => {
  it('returns words in range sorted by no', () => {
    expect(wordsInRange(bank, 2, 3).map((x) => x.id)).toEqual(['c', 'a'])
  })
})
describe('rangeName', () => {
  const d = new Date(2026, 9, 15)
  it('uses day labels when the range matches whole days', () => {
    expect(rangeName(bank, 1, 4, d)).toBe('10/15 Day 1~2')
    expect(rangeName(bank, 3, 4, d)).toBe('10/15 Day 2')
  })
  it('falls back to word numbers', () => {
    expect(rangeName(bank, 2, 3, d)).toBe('10/15 단어 2~3')
  })
})
```

`src/store/ranges.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { resetProgress } from './progress'
import { createRange, listRanges, getCurrentRange, setCurrentRange, setAcademyScore, updateMockBest, getSetting, setSetting } from './ranges'

beforeEach(async () => { await resetProgress() })

describe('ranges', () => {
  it('creates a range and makes it current', async () => {
    const id = await createRange({ bankId: 'b', from: 1, to: 10, name: 'r1' }, 1000)
    const cur = await getCurrentRange()
    expect(cur?.id).toBe(id)
    expect(cur?.mockBest).toBeNull()
  })
  it('lists newest first and switches current', async () => {
    const a = await createRange({ bankId: 'b', from: 1, to: 5, name: 'a' }, 1000)
    const b = await createRange({ bankId: 'b', from: 6, to: 10, name: 'b' }, 2000)
    expect((await listRanges()).map((r) => r.name)).toEqual(['b', 'a'])
    await setCurrentRange(a)
    expect((await getCurrentRange())?.id).toBe(a)
    expect(b).not.toBe(a)
  })
  it('stores academy score and keeps the best mock score', async () => {
    const id = await createRange({ bankId: 'b', from: 1, to: 5, name: 'a' })
    await setAcademyScore(id, 90)
    await updateMockBest(id, 70)
    await updateMockBest(id, 60)
    const r = (await listRanges())[0]
    expect(r.academyScore).toBe(90)
    expect(r.mockBest).toBe(70)
  })
  it('reads settings with fallback', async () => {
    expect(await getSetting('inputMode', 'choice')).toBe('choice')
    await setSetting('inputMode', 'typing')
    expect(await getSetting('inputMode', 'choice')).toBe('typing')
  })
})
```

`src/store/exportImport.test.ts`:
```ts
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
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- --run src/content/range src/store/ranges src/store/exportImport`
Expected: FAIL, 모듈 없음.

- [ ] **Step 3: 구현**

`src/content/range.ts`:
```ts
import type { Bank, Word } from './schema'

export interface DayGroup { label: string; from: number; to: number }

const firstLabel = (source: string) => source.split(',')[0].trim()

export function daysOf(bank: Bank): DayGroup[] {
  const groups: DayGroup[] = []
  for (const w of [...bank.words].sort((a, b) => a.no - b.no)) {
    const label = firstLabel(w.source) || '기타'
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.to = w.no
    else groups.push({ label, from: w.no, to: w.no })
  }
  return groups
}

export function wordsInRange(bank: Bank, from: number, to: number): Word[] {
  return bank.words.filter((w) => w.no >= from && w.no <= to).sort((a, b) => a.no - b.no)
}

export function rangeName(bank: Bank, from: number, to: number, date: Date): string {
  const prefix = `${date.getMonth() + 1}/${date.getDate()}`
  const days = daysOf(bank)
  const first = days.find((d) => d.from === from)
  const last = days.find((d) => d.to === to)
  if (first && last) {
    const a = first.label, b = last.label
    return a === b ? `${prefix} ${a}` : `${prefix} ${a}~${b.replace(/^Day\s*/i, '')}`
  }
  return from === to ? `${prefix} 단어 ${from}` : `${prefix} 단어 ${from}~${to}`
}
```

`src/store/ranges.ts`:
```ts
import { db, type RangeRecord } from './db'

const CURRENT_KEY = 'currentRangeId'

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key)
  return row ? (row.value as T) : fallback
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value })
}

export async function createRange(input: { bankId: string; from: number; to: number; name: string }, now = Date.now()): Promise<number> {
  const id = await db.ranges.add({ ...input, createdAt: now, mockBest: null, academyScore: null })
  await setSetting(CURRENT_KEY, id)
  return id
}

export async function listRanges(): Promise<RangeRecord[]> {
  return db.ranges.orderBy('createdAt').reverse().toArray()
}

export async function getCurrentRange(): Promise<RangeRecord | null> {
  const id = await getSetting<number | null>(CURRENT_KEY, null)
  if (id === null) return null
  return (await db.ranges.get(id)) ?? null
}

export async function setCurrentRange(id: number): Promise<void> {
  await setSetting(CURRENT_KEY, id)
}

export async function setAcademyScore(id: number, score: number | null): Promise<void> {
  await db.ranges.update(id, { academyScore: score })
}

export async function updateMockBest(id: number, score: number): Promise<void> {
  const r = await db.ranges.get(id)
  if (!r) return
  if (r.mockBest === null || score > r.mockBest) await db.ranges.update(id, { mockBest: score })
}
```

`src/store/exportImport.ts`:
```ts
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
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- --run src/content/range src/store/ranges src/store/exportImport`
Expected: 10 passed.

- [ ] **Step 5: 커밋**

```bash
git add src/content/range.ts src/content/range.test.ts src/store/ranges.ts src/store/ranges.test.ts src/store/exportImport.ts src/store/exportImport.test.ts
git commit -m "feat: 범위 유틸·범위 저장·진도 내보내기/가져오기"
```

---

### Task 8: 발음, 앱 컨텍스트, 라우트, 홈 화면

**Files:**
- Create: `src/speech/tts.ts`, `src/app/AppContext.tsx`, `src/screens/Home.tsx`, `src/screens/Placeholder.tsx`
- Modify: `src/app/App.tsx`
- Test: `src/speech/tts.test.ts`, `src/screens/Home.test.tsx`

**Interfaces:**
- Consumes: `loadIndex`, `loadBank`, `BankLoadError`(Task 2), `wordsInRange`(Task 7), `getCurrentRange`(Task 7), `getStates`, `getStreak`, `getTodayCount`(Task 6)
- Produces:
  ```ts
  // speech/tts.ts
  canSpeak(): boolean
  speak(text: string): void      // en-US 음성 우선, 진행 중 발화는 취소
  // app/AppContext.tsx
  interface AppValue { status: 'loading' | 'ready' | 'error'; error: string | null; bank: Bank | null;
    range: RangeRecord | null; rangeWords: Word[]; refreshRange: () => Promise<void> }
  const AppContext: React.Context<AppValue | null>
  function AppProvider({ children }): JSX.Element
  function useApp(): AppValue      // Provider 밖이면 throw
  ```
- 라우트: `/` Home, `/range`, `/tree`, `/blank`, `/pick`, `/mock`, `/stats`, `/settings`. 아직 없는 화면은 `Placeholder`.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/speech/tts.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { canSpeak, speak } from './tts'

describe('tts', () => {
  it('reports false when speechSynthesis is missing', () => {
    expect(canSpeak()).toBe(false)
    expect(() => speak('run')).not.toThrow()
  })
  it('speaks with an en-US voice when available', () => {
    const speakFn = vi.fn()
    const cancel = vi.fn()
    const voices = [{ lang: 'ko-KR', name: 'K' }, { lang: 'en-US', name: 'E' }]
    vi.stubGlobal('speechSynthesis', { speak: speakFn, cancel, getVoices: () => voices })
    vi.stubGlobal('SpeechSynthesisUtterance', class { text: string; voice: unknown = null; lang = ''; rate = 1; constructor(t: string) { this.text = t } })
    expect(canSpeak()).toBe(true)
    speak('run')
    expect(cancel).toHaveBeenCalled()
    const u = speakFn.mock.calls[0][0]
    expect(u.text).toBe('run')
    expect(u.voice).toEqual(voices[1])
    vi.unstubAllGlobals()
  })
})
```

`src/screens/Home.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { AppContext, type AppValue } from '../app/AppContext'
import Home from './Home'

const base: AppValue = { status: 'ready', error: null, bank: { id: 'b', title: 'B', words: [] }, range: null, rangeWords: [], refreshRange: async () => {} }

const renderHome = (v: Partial<AppValue>) =>
  render(<MemoryRouter><AppContext.Provider value={{ ...base, ...v }}><Home /></AppContext.Provider></MemoryRouter>)

describe('Home', () => {
  it('asks to pick a range and disables modes when there is none', () => {
    renderHome({})
    expect(screen.getByText('범위를 골라 주세요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /예문 빈칸/ })).toHaveAttribute('aria-disabled', 'true')
  })
  it('shows range name and word count', () => {
    renderHome({ range: { id: 1, name: '10/15 Day 1', bankId: 'b', from: 1, to: 2, createdAt: 0, mockBest: null, academyScore: null },
      rangeWords: [{ id: 'run', no: 1, source: 'Day 1', word: 'run', pos: '', ipa: '', core: { ko: '', en: '' }, senses: [], koGenerated: false, image: null, etymology: null }] })
    expect(screen.getByText('10/15 Day 1')).toBeInTheDocument()
    expect(screen.getByText(/1단어/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /예문 빈칸/ })).not.toHaveAttribute('aria-disabled', 'true')
  })
  it('shows the error screen', () => {
    renderHome({ status: 'error', error: 'banks/sample.json: 문제' })
    expect(screen.getByText(/아빠에게 알려주세요/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- --run src/speech src/screens/Home`
Expected: FAIL, 모듈 없음.

- [ ] **Step 3: 구현**

`src/speech/tts.ts`:
```ts
export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
}

export function speak(text: string): void {
  if (!canSpeak()) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voices = synth.getVoices()
  const voice = voices.find((v) => v.lang === 'en-US') ?? voices.find((v) => v.lang.startsWith('en')) ?? null
  if (voice) u.voice = voice
  u.lang = 'en-US'
  u.rate = 0.9
  synth.speak(u)
}
```

`src/app/AppContext.tsx`:
```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Bank, Word } from '../content/schema'
import { loadBank, loadIndex } from '../content/loadBank'
import { wordsInRange } from '../content/range'
import { getCurrentRange } from '../store/ranges'
import type { RangeRecord } from '../store/db'

export interface AppValue {
  status: 'loading' | 'ready' | 'error'
  error: string | null
  bank: Bank | null
  range: RangeRecord | null
  rangeWords: Word[]
  refreshRange: () => Promise<void>
}

export const AppContext = createContext<AppValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AppValue['status']>('loading')
  const [error, setError] = useState<string | null>(null)
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
        const entry = index.banks[0]
        if (!entry) throw new Error('index.json에 단어장이 없어요')
        const b = await loadBank(entry.file)
        if (!alive) return
        setBank(b)
        setStatus('ready')
      } catch (e) {
        if (!alive) return
        setError(e instanceof Error ? e.message : String(e))
        setStatus('error')
      }
    })()
    return () => { alive = false }
  }, [])

  useEffect(() => { if (bank) void refreshRange() }, [bank, refreshRange])

  const rangeWords = useMemo(() => (bank && range ? wordsInRange(bank, range.from, range.to) : []), [bank, range])
  const value = useMemo<AppValue>(() => ({ status, error, bank, range, rangeWords, refreshRange }), [status, error, bank, range, rangeWords, refreshRange])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppValue {
  const v = useContext(AppContext)
  if (!v) throw new Error('useApp must be used inside AppProvider')
  return v
}
```

`src/screens/Placeholder.tsx`:
```tsx
import { Link } from 'react-router'

export default function Placeholder({ title }: { title: string }) {
  return (
    <main className="page">
      <div className="topbar"><Link to="/">← 홈</Link><span>{title}</span><span /></div>
      <p className="muted">준비 중이에요.</p>
    </main>
  )
}
```

`src/screens/Home.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useApp } from '../app/AppContext'
import { getStates, getStreak, getTodayCount } from '../store/progress'
import type { Level } from '../study/level'

const MODES = [
  { to: '/tree', label: '파생 트리', hint: '읽기 · 약 5분' },
  { to: '/blank', label: '예문 빈칸', hint: '10문제 · 약 3분' },
  { to: '/pick', label: '뜻 고르기', hint: '10문제 · 약 2분' },
  { to: '/match', label: '영영 매칭', hint: '준비 중', soon: true },
  { to: '/sentence', label: '문장 만들기', hint: '준비 중', soon: true },
  { to: '/mock', label: '학원 모의시험', hint: '전체 · 약 10분' },
]

export default function Home() {
  const { status, error, range, rangeWords } = useApp()
  const [levels, setLevels] = useState<Record<Level, number>>({ 0: 0, 1: 0, 2: 0, 3: 0 })
  const [streak, setStreak] = useState(0)
  const [today, setToday] = useState(0)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const states = await getStates(rangeWords.map((w) => w.id))
      const counts: Record<Level, number> = { 0: 0, 1: 0, 2: 0, 3: 0 }
      for (const s of states.values()) counts[s.level]++
      const [st, td] = await Promise.all([getStreak(), getTodayCount()])
      if (!alive) return
      setLevels(counts); setStreak(st); setToday(td)
    })()
    return () => { alive = false }
  }, [rangeWords])

  if (status === 'loading') return <main className="page"><p className="muted">단어장을 불러오는 중…</p></main>
  if (status === 'error') {
    return (
      <main className="page">
        <h1>단어장을 불러올 수 없어요</h1>
        <p className="danger">{error}</p>
        <p className="muted">아빠에게 알려주세요.</p>
        <button className="btn btn-primary" onClick={() => location.reload()}>다시 시도</button>
      </main>
    )
  }

  const total = rangeWords.length
  const hasRange = total > 0
  const seg = (lv: Level) => ({ width: `${total ? (levels[lv] / total) * 100 : 0}%` })

  return (
    <main className="page stack">
      <h1>하준 영어단어</h1>
      <Link to="/range" className="card stack" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
        {hasRange && range ? (
          <>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>{range.name}</strong><span className="muted">{total}단어</span>
            </div>
            <div className="bar">
              <div className="bar-seg lv3" style={seg(3)} /><div className="bar-seg lv2" style={seg(2)} /><div className="bar-seg lv1" style={seg(1)} />
            </div>
            <div className="muted">확실 {levels[3]} · 익숙 {levels[2]} · 본 적 있음 {levels[1]} · 모름 {levels[0]}</div>
          </>
        ) : (
          <strong>범위를 골라 주세요</strong>
        )}
      </Link>
      <div className="grid-2">
        {MODES.map((m) => {
          const off = !hasRange || m.soon
          return (
            <Link key={m.to} to={off ? '#' : m.to} className="btn" aria-disabled={off ? 'true' : undefined}
              style={off ? { opacity: 0.45, pointerEvents: 'none' } : undefined}>
              <span className="stack" style={{ textAlign: 'center' }}>
                <strong style={{ display: 'block' }}>{m.label}</strong>
                <small className="muted" style={{ display: 'block', marginTop: 2 }}>{m.hint}</small>
              </span>
            </Link>
          )
        })}
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="muted">🔥 {streak}일 연속 · 오늘 {today}문제</span>
        <span className="row"><Link to="/stats" className="btn">기록</Link><Link to="/settings" className="btn">설정</Link></span>
      </div>
    </main>
  )
}
```

`src/app/App.tsx`:
```tsx
import { Routes, Route } from 'react-router'
import { AppProvider } from './AppContext'
import Home from '../screens/Home'
import Placeholder from '../screens/Placeholder'

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/range" element={<Placeholder title="범위 선택" />} />
        <Route path="/tree" element={<Placeholder title="파생 트리" />} />
        <Route path="/blank" element={<Placeholder title="예문 빈칸" />} />
        <Route path="/pick" element={<Placeholder title="뜻 고르기" />} />
        <Route path="/mock" element={<Placeholder title="학원 모의시험" />} />
        <Route path="/stats" element={<Placeholder title="기록" />} />
        <Route path="/settings" element={<Placeholder title="설정" />} />
      </Routes>
    </AppProvider>
  )
}
```

- [ ] **Step 4: 통과 확인·수동 확인**

Run: `npm test -- --run src/speech src/screens/Home`
Expected: 5 passed.

Run: `npm run dev` 후 브라우저에서 `http://localhost:5173/hajun-words/` 열기.
Expected: 제목, "범위를 골라 주세요" 카드, 모드 버튼 6개(모두 흐림), 하단 "0일 연속".

- [ ] **Step 5: 커밋**

```bash
git add src/speech src/app src/screens
git commit -m "feat: 앱 컨텍스트·라우트·홈 화면·발음"
```

---

### Task 9: 범위 선택 화면

**Files:**
- Create: `src/screens/Range.tsx`
- Modify: `src/app/App.tsx` (`/range` 라우트를 `Range`로)
- Test: `src/screens/Range.test.tsx`

**Interfaces:**
- Consumes: `daysOf`, `rangeName`(Task 7), `createRange`, `listRanges`, `setCurrentRange`(Task 7), `useApp`(Task 8)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/screens/Range.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router'
import { AppContext, type AppValue } from '../app/AppContext'
import Range from './Range'
import { resetProgress } from '../store/progress'
import { getCurrentRange } from '../store/ranges'
import type { Bank } from '../content/schema'

const w = (id: string, no: number, source: string) => ({
  id, no, source, word: id, pos: '', ipa: '', core: { ko: '', en: '' },
  senses: [{ ko: 'k', en: 'e', bridge: '', example: 'a x b', blank: 'a ____ b' }], koGenerated: false, image: null, etymology: null,
})
const bank: Bank = { id: 'b', title: 'B', words: [w('a', 1, 'Day 1'), w('b', 2, 'Day 1'), w('c', 3, 'Day 2'), w('d', 4, 'Day 2')] }
const value: AppValue = { status: 'ready', error: null, bank, range: null, rangeWords: [], refreshRange: async () => {} }

beforeEach(async () => { await resetProgress() })

describe('Range', () => {
  it('saves a day range and navigates home', async () => {
    render(
      <MemoryRouter initialEntries={['/range']}>
        <AppContext.Provider value={value}>
          <Routes><Route path="/range" element={<Range />} /><Route path="/" element={<p>HOME</p>} /></Routes>
        </AppContext.Provider>
      </MemoryRouter>,
    )
    await userEvent.selectOptions(screen.getByLabelText('시작'), 'Day 2')
    await userEvent.selectOptions(screen.getByLabelText('끝'), 'Day 2')
    expect(screen.getByLabelText('시작 번호')).toHaveValue(3)
    await userEvent.click(screen.getByRole('button', { name: '이 범위로 공부하기' }))
    await waitFor(() => expect(screen.getByText('HOME')).toBeInTheDocument())
    const cur = await getCurrentRange()
    expect(cur?.from).toBe(3)
    expect(cur?.to).toBe(4)
    expect(cur?.name).toMatch(/Day 2$/)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- --run src/screens/Range`
Expected: FAIL, `Cannot find module './Range'`.

- [ ] **Step 3: 구현**

`src/screens/Range.tsx`:
```tsx
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useApp } from '../app/AppContext'
import { daysOf, rangeName } from '../content/range'
import { createRange, listRanges, setCurrentRange } from '../store/ranges'
import type { RangeRecord } from '../store/db'

export default function Range() {
  const { bank, range, refreshRange } = useApp()
  const navigate = useNavigate()
  const days = useMemo(() => (bank ? daysOf(bank) : []), [bank])
  const maxNo = bank ? Math.max(...bank.words.map((w) => w.no)) : 1
  const [from, setFrom] = useState(range?.from ?? days[0]?.from ?? 1)
  const [to, setTo] = useState(range?.to ?? days[0]?.to ?? 1)
  const [recent, setRecent] = useState<RangeRecord[]>([])

  useEffect(() => { void listRanges().then(setRecent) }, [])

  if (!bank) return null
  const startDay = days.find((d) => d.from === from)?.label ?? ''
  const endDay = days.find((d) => d.to === to)?.label ?? ''
  const valid = from >= 1 && to <= maxNo && from <= to
  const count = bank.words.filter((w) => w.no >= from && w.no <= to).length

  const save = async () => {
    await createRange({ bankId: bank.id, from, to, name: rangeName(bank, from, to, new Date()) })
    await refreshRange()
    navigate('/')
  }
  const pick = async (r: RangeRecord) => {
    await setCurrentRange(r.id!)
    await refreshRange()
    navigate('/')
  }

  return (
    <main className="page stack">
      <div className="topbar"><Link to="/">← 홈</Link><span>범위 선택</span><span /></div>
      <section className="card stack">
        <h2 style={{ marginTop: 0 }}>Day로 고르기</h2>
        <div className="row">
          <div className="stack" style={{ flex: 1 }}><span className="muted">시작</span>
            <select className="input" aria-label="시작" value={startDay} onChange={(e) => {
              const d = days.find((x) => x.label === e.target.value); if (d) { setFrom(d.from); if (to < d.from) setTo(d.to) }
            }}>
              <option value="">—</option>{days.map((d) => <option key={d.label} value={d.label}>{d.label}</option>)}
            </select>
          </div>
          <div className="stack" style={{ flex: 1 }}><span className="muted">끝</span>
            <select className="input" aria-label="끝" value={endDay} onChange={(e) => {
              const d = days.find((x) => x.label === e.target.value); if (d) { setTo(d.to); if (from > d.to) setFrom(d.from) }
            }}>
              <option value="">—</option>{days.map((d) => <option key={d.label} value={d.label}>{d.label}</option>)}
            </select>
          </div>
        </div>
        <h2>번호로 고르기</h2>
        <div className="row">
          <input className="input" type="number" aria-label="시작 번호" min={1} max={maxNo} value={from} onChange={(e) => setFrom(Number(e.target.value))} />
          <span>~</span>
          <input className="input" type="number" aria-label="끝 번호" min={1} max={maxNo} value={to} onChange={(e) => setTo(Number(e.target.value))} />
        </div>
        <button className="btn" onClick={() => { setFrom(1); setTo(range?.to ?? maxNo) }}>지금까지 전부 (1~{range?.to ?? maxNo})</button>
        <p className="muted">{valid ? `${count}단어 · ${rangeName(bank, from, to, new Date())}` : '범위를 확인해 주세요'}</p>
        <button className="btn btn-primary btn-block" disabled={!valid} onClick={save}>이 범위로 공부하기</button>
      </section>
      {recent.length > 0 && (
        <section className="stack">
          <h2>최근 범위</h2>
          {recent.map((r) => (
            <button key={r.id} className="btn btn-block" style={{ justifyContent: 'space-between' }} onClick={() => pick(r)}>
              <span>{r.name}</span><span className="muted">{r.from}~{r.to}</span>
            </button>
          ))}
        </section>
      )}
    </main>
  )
}
```

`src/app/App.tsx`에서 `/range`를 교체:
```tsx
import Range from '../screens/Range'
// ...
<Route path="/range" element={<Range />} />
```

- [ ] **Step 4: 통과 확인·수동 확인**

Run: `npm test -- --run src/screens/Range`
Expected: 1 passed.

`npm run dev`에서 홈 카드 클릭 → Day 1~Day 2 선택 → 저장 → 홈에 "10/15 Day 1~2 · 10단어"와 레벨 막대 표시, 모드 버튼 활성.

- [ ] **Step 5: 커밋**

```bash
git add src/screens/Range.tsx src/screens/Range.test.tsx src/app/App.tsx
git commit -m "feat: 범위 선택 화면 (Day·번호·최근 범위)"
```

---

### Task 10: 파생 트리 모드

**Files:**
- Create: `src/modes/Tree.tsx`, `src/modes/WordTree.tsx`
- Modify: `src/app/App.tsx` (`/tree` → `Tree`)
- Test: `src/modes/WordTree.test.tsx`

**Interfaces:**
- Consumes: `Word`(Task 2), `canSpeak`, `speak`(Task 8), `recordView`(Task 6), `useApp`(Task 8), `blankAnswer`(Task 2)
- Produces: `WordTree({ word, mySentences?: string[] })` 순수 표시 컴포넌트. `Tree` 화면은 범위 단어를 번호 순으로 한 장씩 넘기며 표시 시 `recordView`.
- `/tree?start=<wordId>`로 열면 그 단어부터 시작(모의시험 오답에서 사용).

- [ ] **Step 1: 실패하는 테스트 작성**

`src/modes/WordTree.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import WordTree from './WordTree'
import type { Word } from '../content/schema'

const fine: Word = {
  id: 'fine', no: 2, source: 'Day 1', word: 'fine', pos: 'adj., n.', ipa: '/faɪn/',
  core: { ko: '흠 없이 곱게 다듬어진 것', en: 'finished so well that nothing is wrong' },
  senses: [
    { ko: '좋은', en: 'good or healthy', bridge: '흠이 없으면 좋은 것', example: 'I feel fine today.', blank: 'I feel ____ today.' },
    { ko: '벌금', en: 'money you pay for breaking a rule', bridge: "다른 뿌리: '끝내다'에서", example: 'I paid a fine for parking there.', blank: 'I paid a ____ for parking there.' },
  ],
  koGenerated: false, image: null, etymology: '벌금은 finis(끝)에서 왔어요.',
}

describe('WordTree', () => {
  it('renders core, branches, examples with the word highlighted, and etymology', () => {
    const { container } = render(<WordTree word={fine} />)
    expect(screen.getByText('fine', { selector: '.big' })).toBeInTheDocument()
    expect(screen.getByText('흠 없이 곱게 다듬어진 것')).toBeInTheDocument()
    expect(screen.getByText('좋은')).toBeInTheDocument()
    expect(screen.getByText('벌금')).toBeInTheDocument()
    expect(screen.getByText('money you pay for breaking a rule')).toBeInTheDocument()
    expect(screen.getByText(/finis/)).toBeInTheDocument()
    expect([...container.querySelectorAll('mark')].map((m) => m.textContent)).toEqual(['fine', 'fine'])
  })
  it('shows my sentences when given', () => {
    render(<WordTree word={fine} mySentences={['That is fine by me.']} />)
    expect(screen.getByText('That is fine by me.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- --run src/modes/WordTree`
Expected: FAIL, 모듈 없음.

- [ ] **Step 3: 구현**

`src/modes/WordTree.tsx`:
```tsx
import type { Sense, Word } from '../content/schema'
import { blankAnswer } from '../content/blank'
import { canSpeak, speak } from '../speech/tts'

function Example({ sense }: { sense: Sense }) {
  const target = blankAnswer(sense)
  const i = target ? sense.example.indexOf(target) : -1
  if (i < 0) return <div className="example">{sense.example}</div>
  return (
    <div className="example">
      {sense.example.slice(0, i)}<mark>{target}</mark>{sense.example.slice(i + target.length)}
    </div>
  )
}

export default function WordTree({ word, mySentences = [] }: { word: Word; mySentences?: string[] }) {
  return (
    <article className="stack">
      {word.image && <img src={`${import.meta.env.BASE_URL}content/${word.image}`} alt="" style={{ width: '100%', borderRadius: 14 }} />}
      <div className="tree-core">
        <div className="row" style={{ justifyContent: 'center' }}>
          <span className="big">{word.word}</span>
          {canSpeak() && <button className="btn" aria-label="발음 듣기" onClick={() => speak(word.word)}>🔊</button>}
        </div>
        <div className="muted">{word.pos} {word.ipa}</div>
        <div style={{ marginTop: 8 }}><strong>{word.core.ko}</strong></div>
        <div className="muted">{word.core.en}</div>
      </div>
      <div className="tree-branches">
        {word.senses.map((s, i) => (
          <div className="branch" key={i}>
            <div className="bridge">{s.bridge || '→'}</div>
            <div><strong>{s.ko}</strong></div>
            <div className="muted">{s.en}</div>
            <Example sense={s} />
            {canSpeak() && <button className="btn" style={{ marginTop: 6, minHeight: 36, padding: '4px 10px' }} onClick={() => speak(s.example)}>🔊 문장</button>}
          </div>
        ))}
      </div>
      {word.etymology && <p className="muted">📜 {word.etymology}</p>}
      {mySentences.length > 0 && (
        <div className="card stack">
          <strong>내 문장</strong>
          {mySentences.map((t, i) => <div key={i}>{t}</div>)}
        </div>
      )}
    </article>
  )
}
```

`src/modes/Tree.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useApp } from '../app/AppContext'
import { recordView } from '../store/progress'
import WordTree from './WordTree'

export default function Tree() {
  const { rangeWords } = useApp()
  const [params] = useSearchParams()
  const start = Math.max(0, rangeWords.findIndex((w) => w.id === params.get('start')))
  const [i, setI] = useState(start)
  const word = rangeWords[i]

  useEffect(() => { if (word) void recordView(word.id) }, [word])

  if (!word) return <main className="page"><p className="muted">범위에 단어가 없어요.</p><Link to="/" className="btn">홈으로</Link></main>
  return (
    <main className="page stack">
      <div className="topbar"><Link to="/">← 홈</Link><span>파생 트리 {i + 1}/{rangeWords.length}</span><span /></div>
      <WordTree word={word} />
      <div className="row">
        <button className="btn" style={{ flex: 1 }} disabled={i === 0} onClick={() => setI(i - 1)}>이전</button>
        <button className="btn btn-primary" style={{ flex: 1 }} disabled={i === rangeWords.length - 1} onClick={() => setI(i + 1)}>다음</button>
      </div>
    </main>
  )
}
```

`src/app/App.tsx`: `import Tree from '../modes/Tree'`, `<Route path="/tree" element={<Tree />} />`.

- [ ] **Step 4: 통과 확인·수동 확인**

Run: `npm test -- --run src/modes/WordTree`
Expected: 2 passed.

`npm run dev`에서 파생 트리 열기: run 카드에 핵심 의미, 가지 4개, 예문의 `runs`가 강조, 🔊 버튼 클릭 시 발음. 홈으로 돌아오면 "본 적 있음"이 1 증가.

- [ ] **Step 5: 커밋**

```bash
git add src/modes/WordTree.tsx src/modes/WordTree.test.tsx src/modes/Tree.tsx src/app/App.tsx
git commit -m "feat: 파생 트리 모드"
```

---

### Task 11: 퀴즈 회차 (빈칸·뜻 고르기)

**Files:**
- Create: `src/modes/QuizRound.tsx`, `src/modes/QuizScreen.tsx`
- Modify: `src/app/App.tsx` (`/blank`, `/pick`)
- Test: `src/modes/QuizRound.test.tsx`

**Interfaces:**
- Consumes: `Question`, `buildRound`(Task 4), `gradeBlankInput`(Task 5), `getStates`, `recordAnswer`, `recordSession`(Task 6), `getSetting`(Task 7), `useApp`(Task 8)
- Produces:
  ```ts
  QuizRound({ questions: Question[]; inputMode: 'choice' | 'typing'; onAnswer: (q: Question, correct: boolean) => void; onFinish: (correct: number) => void })
  QuizScreen({ mode: 'blank' | 'pick' })
  ```
- 설정 키 `blankInputMode` ('choice' 기본). 뜻 고르기는 항상 선택형.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/modes/QuizRound.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuizRound from './QuizRound'
import type { Question } from '../study/picker'

const qs: Question[] = [
  { kind: 'blank', wordId: 'run', senseIndex: 0, prompt: 'She ____ every morning.', answer: 'run', accept: ['run', 'runs'],
    options: ['fine', 'run', 'bank', 'draw'], explain: 'to move fast on foot' },
  { kind: 'pick', wordId: 'fine', senseIndex: 2, sentence: 'I paid a fine for parking there.', answer: '벌금',
    options: ['좋은', '가는', '벌금', '은행'], explain: 'money you pay for breaking a rule' },
]

describe('QuizRound', () => {
  it('walks through choice questions, shows feedback and finishes with the correct count', async () => {
    const onAnswer = vi.fn(); const onFinish = vi.fn()
    render(<QuizRound questions={qs} inputMode="choice" onAnswer={onAnswer} onFinish={onFinish} />)
    expect(screen.getByText('She ____ every morning.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'bank' }))
    expect(onAnswer).toHaveBeenCalledWith(qs[0], false)
    expect(screen.getByText(/정답: run/)).toBeInTheDocument()
    expect(screen.getByText('to move fast on foot')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '다음' }))
    await userEvent.click(screen.getByRole('button', { name: '벌금' }))
    expect(onAnswer).toHaveBeenCalledWith(qs[1], true)
    await userEvent.click(screen.getByRole('button', { name: '결과 보기' }))
    expect(onFinish).toHaveBeenCalledWith(1)
  })
  it('accepts typed answers in typing mode', async () => {
    const onAnswer = vi.fn()
    render(<QuizRound questions={[qs[0]]} inputMode="typing" onAnswer={onAnswer} onFinish={() => {}} />)
    await userEvent.type(screen.getByLabelText('답 입력'), 'Runs{enter}')
    expect(onAnswer).toHaveBeenCalledWith(qs[0], true)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- --run src/modes/QuizRound`
Expected: FAIL, 모듈 없음.

- [ ] **Step 3: 구현**

`src/modes/QuizRound.tsx`:
```tsx
import { useState, type FormEvent } from 'react'
import type { Question } from '../study/picker'
import { gradeBlankInput } from '../study/grading'

interface Props {
  questions: Question[]
  inputMode: 'choice' | 'typing'
  onAnswer: (q: Question, correct: boolean) => void
  onFinish: (correct: number) => void
}

export default function QuizRound({ questions, inputMode, onAnswer, onFinish }: Props) {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [typed, setTyped] = useState('')
  const q = questions[i]
  const answered = picked !== null
  const isCorrect = answered && (q.kind === 'blank' && inputMode === 'typing' ? gradeBlankInput(q, picked) : picked === q.answer)
  const last = i === questions.length - 1

  const answer = (value: string) => {
    if (answered) return
    const ok = q.kind === 'blank' && inputMode === 'typing' ? gradeBlankInput(q, value) : value === q.answer
    setPicked(value)
    if (ok) setCorrectCount((c) => c + 1)
    onAnswer(q, ok)
  }
  const next = () => {
    if (last) { onFinish(correctCount); return }
    setI(i + 1); setPicked(null); setTyped('')
  }
  const submitTyped = (e: FormEvent) => { e.preventDefault(); if (typed.trim()) answer(typed) }

  return (
    <div className="stack">
      <div className="muted">{i + 1} / {questions.length}</div>
      <div className="card">
        {q.kind === 'blank' ? <p style={{ fontSize: '1.2rem', margin: 0 }}>{q.prompt}</p>
          : <><p style={{ fontSize: '1.2rem', margin: 0 }}>{q.sentence}</p><p className="muted" style={{ margin: '6px 0 0' }}>이 문장에서 쓰인 뜻은?</p></>}
      </div>
      {q.kind === 'blank' && inputMode === 'typing' ? (
        <form onSubmit={submitTyped} className="row">
          <input className="input" aria-label="답 입력" autoFocus autoCapitalize="none" autoCorrect="off" value={typed}
            disabled={answered} onChange={(e) => setTyped(e.target.value)} />
          <button className="btn btn-primary" type="submit" disabled={answered}>확인</button>
        </form>
      ) : (
        <div className="stack">
          {q.options.map((o) => {
            const cls = answered ? (o === q.answer ? ' correct' : o === picked ? ' wrong' : '') : ''
            return <button key={o} className={`btn btn-block option${cls}`} disabled={answered} onClick={() => answer(o)}>{o}</button>
          })}
        </div>
      )}
      {answered && (
        <div className={`card ${isCorrect ? '' : 'danger'}`}>
          <strong>{isCorrect ? '맞았어요!' : `정답: ${q.answer}`}</strong>
          <div className="muted">{q.explain}</div>
        </div>
      )}
      {answered && <button className="btn btn-primary btn-block" onClick={next}>{last ? '결과 보기' : '다음'}</button>}
    </div>
  )
}
```

`src/modes/QuizScreen.tsx`:
```tsx
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useApp } from '../app/AppContext'
import { buildRound, type Question } from '../study/picker'
import type { WordState } from '../study/level'
import { getStates, recordAnswer, recordSession } from '../store/progress'
import { getSetting } from '../store/ranges'
import QuizRound from './QuizRound'

const TITLE = { blank: '예문 빈칸', pick: '뜻 고르기' } as const

export default function QuizScreen({ mode }: { mode: 'blank' | 'pick' }) {
  const { bank, range, rangeWords } = useApp()
  const [questions, setQuestions] = useState<Question[] | null>(null)
  const [before, setBefore] = useState<Map<string, WordState>>(new Map())
  const [inputMode, setInputMode] = useState<'choice' | 'typing'>('choice')
  const [result, setResult] = useState<{ correct: number; total: number; up: string[] } | null>(null)
  const [key, setKey] = useState(0)

  const start = useCallback(async () => {
    if (!bank) return
    const states = await getStates(rangeWords.map((w) => w.id))
    setBefore(states)
    setInputMode(await getSetting<'choice' | 'typing'>('blankInputMode', 'choice'))
    setQuestions(buildRound(mode, rangeWords, bank.words, states, Date.now(), Math.random))
    setResult(null)
    setKey((k) => k + 1)
  }, [bank, rangeWords, mode])

  useEffect(() => { void start() }, [start])

  const onFinish = async (correct: number) => {
    if (!questions || !range) return
    await recordSession({ mode, rangeId: range.id!, at: Date.now(), correct, total: questions.length })
    const after = await getStates(questions.map((q) => q.wordId))
    const up = [...after.values()].filter((s) => s.level > (before.get(s.id)?.level ?? 0)).map((s) => s.id)
    setResult({ correct, total: questions.length, up })
  }

  if (!questions) return <main className="page"><p className="muted">문제를 만드는 중…</p></main>
  if (questions.length === 0) return <main className="page"><p className="muted">범위에 단어가 없어요.</p><Link to="/" className="btn">홈으로</Link></main>

  return (
    <main className="page stack">
      <div className="topbar"><Link to="/">← 홈</Link><span>{TITLE[mode]}</span><span /></div>
      {result ? (
        <div className="card stack center">
          <div className="big">{result.correct} / {result.total}</div>
          {result.up.length > 0 && <div>레벨 업 ⬆ {result.up.join(', ')}</div>}
          <button className="btn btn-primary btn-block" onClick={start}>한 번 더</button>
          <Link to="/" className="btn btn-block">홈으로</Link>
        </div>
      ) : (
        <QuizRound key={key} questions={questions} inputMode={mode === 'blank' ? inputMode : 'choice'}
          onAnswer={(q, ok) => { void recordAnswer(q.wordId, ok, mode) }} onFinish={onFinish} />
      )}
    </main>
  )
}
```

`src/app/App.tsx`: `import QuizScreen from '../modes/QuizScreen'`, `/blank` → `<QuizScreen mode="blank" />`, `/pick` → `<QuizScreen mode="pick" />`.

- [ ] **Step 4: 통과 확인·수동 확인**

Run: `npm test -- --run src/modes/QuizRound`
Expected: 2 passed.

`npm run dev`: 빈칸 10문제 풀기 → 결과 화면에 점수, "한 번 더" → 새 문제. 홈에 "오늘 10문제", 레벨 막대 변화.

- [ ] **Step 5: 커밋**

```bash
git add src/modes/QuizRound.tsx src/modes/QuizRound.test.tsx src/modes/QuizScreen.tsx src/app/App.tsx
git commit -m "feat: 예문 빈칸·뜻 고르기 회차"
```

---

### Task 12: 학원 모의시험

**Files:**
- Create: `src/modes/MockForm.tsx`, `src/modes/MockExam.tsx`
- Modify: `src/app/App.tsx` (`/mock`)
- Test: `src/modes/MockForm.test.tsx`

**Interfaces:**
- Consumes: `Word`(Task 2), `gradeMockExam`, `MockWordResult`(Task 5), `shuffle`(Task 4), `recordAnswer`, `recordSession`(Task 6), `updateMockBest`(Task 7), `useApp`(Task 8)
- Produces: `MockForm({ words: Word[]; onSubmit: (answers: Record<string, string[]>) => void })` 순수 폼. 단어마다 `senses.length`개의 입력칸, aria-label `"<word> 뜻 <n>"`.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/modes/MockForm.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockForm from './MockForm'
import type { Word } from '../content/schema'

const mk = (id: string, kos: string[]): Word => ({
  id, no: 1, source: '', word: id, pos: '', ipa: '', core: { ko: '', en: '' },
  senses: kos.map((ko) => ({ ko, en: 'e', bridge: '', example: `a ${id} b`, blank: 'a ____ b' })), koGenerated: false, image: null, etymology: null,
})

describe('MockForm', () => {
  it('renders one input per sense and submits answers by word id', async () => {
    const onSubmit = vi.fn()
    render(<MockForm words={[mk('run', ['달리다', '흐르다']), mk('bank', ['은행'])]} onSubmit={onSubmit} />)
    expect(screen.getAllByRole('textbox')).toHaveLength(3)
    await userEvent.type(screen.getByLabelText('run 뜻 1'), '달리다')
    await userEvent.type(screen.getByLabelText('run 뜻 2'), '흐르다')
    await userEvent.click(screen.getByRole('button', { name: '채점하기' }))
    expect(onSubmit).toHaveBeenCalledWith({ run: ['달리다', '흐르다'], bank: [''] })
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- --run src/modes/MockForm`
Expected: FAIL, 모듈 없음.

- [ ] **Step 3: 구현**

`src/modes/MockForm.tsx`:
```tsx
import { useState, type FormEvent } from 'react'
import type { Word } from '../content/schema'

export default function MockForm({ words, onSubmit }: { words: Word[]; onSubmit: (answers: Record<string, string[]>) => void }) {
  const [answers, setAnswers] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(words.map((w) => [w.id, w.senses.map(() => '')])))
  const set = (id: string, i: number, v: string) =>
    setAnswers((a) => ({ ...a, [id]: a[id].map((x, j) => (j === i ? v : x)) }))
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit(answers) }
  return (
    <form onSubmit={submit} className="stack">
      {words.map((w, n) => (
        <div className="card stack" key={w.id}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong style={{ fontSize: '1.2rem' }}>{n + 1}. {w.word}</strong><span className="muted">{w.pos}</span>
          </div>
          {w.senses.map((_, i) => (
            <input key={i} className="input" aria-label={`${w.word} 뜻 ${i + 1}`} placeholder={`뜻 ${i + 1}`}
              value={answers[w.id][i]} onChange={(e) => set(w.id, i, e.target.value)} />
          ))}
        </div>
      ))}
      <button type="submit" className="btn btn-primary btn-block">채점하기</button>
    </form>
  )
}
```

`src/modes/MockExam.tsx`:
```tsx
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useApp } from '../app/AppContext'
import { gradeMockExam, type MockWordResult } from '../study/grading'
import { shuffle } from '../study/picker'
import { recordAnswer, recordSession } from '../store/progress'
import { updateMockBest } from '../store/ranges'
import MockForm from './MockForm'

export default function MockExam() {
  const { range, rangeWords } = useApp()
  const [order, setOrder] = useState<'number' | 'shuffle'>('number')
  const [started, setStarted] = useState(false)
  const [result, setResult] = useState<{ score: number; results: MockWordResult[] } | null>(null)
  const words = useMemo(() => (order === 'shuffle' ? shuffle(rangeWords, Math.random) : rangeWords), [rangeWords, order])
  const byId = useMemo(() => new Map(rangeWords.map((w) => [w.id, w])), [rangeWords])

  const submit = async (answers: Record<string, string[]>) => {
    const r = gradeMockExam(words, answers)
    for (const w of r.results) await recordAnswer(w.wordId, w.matched === w.total, 'mock')
    if (range?.id !== undefined) {
      await recordSession({ mode: 'mock', rangeId: range.id, at: Date.now(), correct: r.results.filter((x) => x.matched === x.total).length, total: words.length })
      await updateMockBest(range.id, r.score)
    }
    setResult(r)
    window.scrollTo(0, 0)
  }

  if (rangeWords.length === 0) return <main className="page"><p className="muted">범위에 단어가 없어요.</p><Link to="/" className="btn">홈으로</Link></main>

  return (
    <main className="page stack">
      <div className="topbar"><Link to="/">← 홈</Link><span>학원 모의시험</span><span /></div>
      {!started && (
        <div className="card stack">
          <p>단어 {rangeWords.length}개, 뜻을 모두 써요. 순서는 상관없어요.</p>
          <div className="row">
            <button className={`btn ${order === 'number' ? 'btn-primary' : ''}`} onClick={() => setOrder('number')}>번호 순</button>
            <button className={`btn ${order === 'shuffle' ? 'btn-primary' : ''}`} onClick={() => setOrder('shuffle')}>섞기</button>
          </div>
          <button className="btn btn-primary btn-block" onClick={() => setStarted(true)}>시작</button>
        </div>
      )}
      {started && !result && <MockForm words={words} onSubmit={submit} />}
      {result && (
        <div className="stack">
          <div className="card center"><div className="big">{result.score}점</div><div className="muted">{range?.name}</div></div>
          {result.results.filter((r) => r.missed.length).map((r) => {
            const w = byId.get(r.wordId)!
            return (
              <div className="card" key={r.wordId}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>{w.word}</strong><span className="muted">{r.matched}/{r.total}</span>
                </div>
                <div className="danger">놓친 뜻: {r.missed.join(', ')}</div>
                <Link to={`/tree?start=${w.id}`} className="btn" style={{ marginTop: 8 }}>파생 트리 보기</Link>
              </div>
            )
          })}
          <button className="btn btn-primary btn-block" onClick={() => { setResult(null); setStarted(false) }}>다시 보기</button>
          <Link to="/" className="btn btn-block">홈으로</Link>
        </div>
      )}
    </main>
  )
}
```

`src/app/App.tsx`: `import MockExam from '../modes/MockExam'`, `/mock` → `<MockExam />`.

- [ ] **Step 4: 통과 확인·수동 확인**

Run: `npm test -- --run src/modes/MockForm`
Expected: 1 passed.

`npm run dev`: 모의시험 시작 → run에 "달리다/운영하다/흐르다/작동하다" 입력, 나머지 빈칸 → 채점 → 점수 10점, 틀린 단어 카드와 "파생 트리 보기" 클릭 시 해당 단어부터 열림.

- [ ] **Step 5: 커밋**

```bash
git add src/modes/MockForm.tsx src/modes/MockForm.test.tsx src/modes/MockExam.tsx src/app/App.tsx
git commit -m "feat: 학원 모의시험 (전체 뜻 입력·채점·오답 트리 이동)"
```

---

### Task 13: 기록 화면

**Files:**
- Create: `src/screens/Stats.tsx`
- Modify: `src/app/App.tsx` (`/stats`)
- Test: `src/screens/Stats.test.tsx`

**Interfaces:**
- Consumes: `getStates`(Task 6), `isStale`(Task 3), `listRanges`(Task 7), `useApp`(Task 8)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/screens/Stats.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AppContext, type AppValue } from '../app/AppContext'
import Stats from './Stats'
import { resetProgress, recordAnswer } from '../store/progress'
import { createRange, setAcademyScore, updateMockBest } from '../store/ranges'
import type { Word } from '../content/schema'

const w = (id: string, no: number): Word => ({ id, no, source: 'Day 1', word: id, pos: '', ipa: '', core: { ko: '', en: '' },
  senses: [{ ko: 'k', en: 'e', bridge: '', example: 'a x b', blank: 'a ____ b' }], koGenerated: false, image: null, etymology: null })
const words = [w('run', 1), w('fine', 2)]
const value: AppValue = { status: 'ready', error: null, bank: { id: 'b', title: 'B', words }, range: null, rangeWords: words, refreshRange: async () => {} }

beforeEach(async () => { await resetProgress() })

describe('Stats', () => {
  it('lists word levels with a filter and shows range scores', async () => {
    await recordAnswer('run', true, 'blank', 1000)
    await recordAnswer('run', true, 'blank', 1001)
    const id = await createRange({ bankId: 'b', from: 1, to: 2, name: '10/15 Day 1' }, 1000)
    await setAcademyScore(id, 90)
    await updateMockBest(id, 80)
    render(<MemoryRouter><AppContext.Provider value={value}><Stats /></AppContext.Provider></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('10/15 Day 1')).toBeInTheDocument())
    expect(screen.getByText('80')).toBeInTheDocument()
    expect(screen.getByText('90')).toBeInTheDocument()
    expect(screen.getByText('run')).toBeInTheDocument()
    expect(screen.getByText('fine')).toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('모름만 보기'))
    expect(screen.queryByText('run')).not.toBeInTheDocument()
    expect(screen.getByText('fine')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- --run src/screens/Stats`
Expected: FAIL, 모듈 없음.

- [ ] **Step 3: 구현**

`src/screens/Stats.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useApp } from '../app/AppContext'
import { getStates } from '../store/progress'
import { listRanges } from '../store/ranges'
import { isStale, type WordState } from '../study/level'
import type { RangeRecord } from '../store/db'

const LEVEL_LABEL = ['모름', '본 적 있음', '익숙', '확실']

export default function Stats() {
  const { rangeWords } = useApp()
  const [states, setStates] = useState<Map<string, WordState>>(new Map())
  const [ranges, setRanges] = useState<RangeRecord[]>([])
  const [onlyUnknown, setOnlyUnknown] = useState(false)

  useEffect(() => {
    void getStates(rangeWords.map((w) => w.id)).then(setStates)
    void listRanges().then(setRanges)
  }, [rangeWords])

  const now = Date.now()
  const rows = rangeWords.filter((w) => !onlyUnknown || (states.get(w.id)?.level ?? 0) === 0)

  return (
    <main className="page stack">
      <div className="topbar"><Link to="/">← 홈</Link><span>기록</span><span /></div>
      <h2>범위별 점수</h2>
      <div className="card stack">
        <div className="row muted" style={{ justifyContent: 'space-between' }}><span>범위</span><span>모의시험 최고 · 학원</span></div>
        {ranges.length === 0 && <p className="muted">아직 범위가 없어요.</p>}
        {ranges.map((r) => (
          <div className="row" style={{ justifyContent: 'space-between' }} key={r.id}>
            <span>{r.name}</span>
            <span><span>{r.mockBest ?? '-'}</span> · <span>{r.academyScore ?? '-'}</span></span>
          </div>
        ))}
      </div>
      <h2>이번 범위 단어</h2>
      <label className="row"><input type="checkbox" checked={onlyUnknown} onChange={(e) => setOnlyUnknown(e.target.checked)} /> 모름만 보기</label>
      <div className="stack">
        {rows.map((w) => {
          const s = states.get(w.id)
          const lv = s?.level ?? 0
          return (
            <div className={`card row ${s && isStale(s, now) ? 'stale' : ''}`} style={{ justifyContent: 'space-between', padding: '10px 14px' }} key={w.id}>
              <span><strong>{w.word}</strong> <span className="muted">{w.senses.map((x) => x.ko).join(', ')}</span></span>
              <span className={`badge lv${lv}`}>{LEVEL_LABEL[lv]}</span>
            </div>
          )
        })}
      </div>
    </main>
  )
}
```

`src/app/App.tsx`: `import Stats from '../screens/Stats'`, `/stats` → `<Stats />`.

- [ ] **Step 4: 통과 확인**

Run: `npm test -- --run src/screens/Stats`
Expected: 1 passed.

- [ ] **Step 5: 커밋**

```bash
git add src/screens/Stats.tsx src/screens/Stats.test.tsx src/app/App.tsx
git commit -m "feat: 기록 화면 (단어 레벨 목록·범위별 점수)"
```

---

### Task 14: 설정 화면

**Files:**
- Create: `src/screens/Settings.tsx`
- Modify: `src/app/App.tsx` (`/settings`)
- Test: `src/screens/Settings.test.tsx`

**Interfaces:**
- Consumes: `listRanges`, `setAcademyScore`, `getSetting`, `setSetting`(Task 7), `exportAll`, `importAll`(Task 7), `resetProgress`(Task 6), `useApp`(Task 8)
- 설정 키 `blankInputMode`: `'choice' | 'typing'`.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/screens/Settings.test.tsx`:
```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AppContext, type AppValue } from '../app/AppContext'
import Settings from './Settings'
import { resetProgress } from '../store/progress'
import { createRange, listRanges, getSetting } from '../store/ranges'

const value: AppValue = { status: 'ready', error: null, bank: { id: 'b', title: 'B', words: [] }, range: null, rangeWords: [], refreshRange: async () => {} }
const renderIt = () => render(<MemoryRouter><AppContext.Provider value={value}><Settings /></AppContext.Provider></MemoryRouter>)

beforeEach(async () => { await resetProgress() })

describe('Settings', () => {
  it('saves academy score for a range', async () => {
    await createRange({ bankId: 'b', from: 1, to: 2, name: 'r1' })
    renderIt()
    const input = await screen.findByLabelText('r1 학원 점수')
    await userEvent.type(input, '85')
    await userEvent.tab()
    await waitFor(async () => expect((await listRanges())[0].academyScore).toBe(85))
  })
  it('toggles blank input mode', async () => {
    renderIt()
    await userEvent.click(await screen.findByLabelText('빈칸 직접 입력'))
    await waitFor(async () => expect(await getSetting('blankInputMode', 'choice')).toBe('typing'))
  })
  it('resets only after confirm', async () => {
    await createRange({ bankId: 'b', from: 1, to: 2, name: 'r1' })
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderIt()
    await userEvent.click(await screen.findByRole('button', { name: '진도 초기화' }))
    expect(await listRanges()).toHaveLength(1)
    vi.restoreAllMocks()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- --run src/screens/Settings`
Expected: FAIL, 모듈 없음.

- [ ] **Step 3: 구현**

`src/screens/Settings.tsx`:
```tsx
import { useEffect, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router'
import { useApp } from '../app/AppContext'
import { listRanges, setAcademyScore, getSetting, setSetting } from '../store/ranges'
import { exportAll, importAll } from '../store/exportImport'
import { resetProgress } from '../store/progress'
import type { RangeRecord } from '../store/db'

export default function Settings() {
  const { refreshRange } = useApp()
  const [ranges, setRanges] = useState<RangeRecord[]>([])
  const [typing, setTyping] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const reload = async () => {
    setRanges(await listRanges())
    setTyping((await getSetting<'choice' | 'typing'>('blankInputMode', 'choice')) === 'typing')
  }
  useEffect(() => { void reload() }, [])

  const saveScore = async (r: RangeRecord, raw: string) => {
    const n = raw.trim() === '' ? null : Number(raw)
    if (n !== null && (Number.isNaN(n) || n < 0 || n > 100)) { setMsg('0~100 사이 숫자를 넣어 주세요'); return }
    await setAcademyScore(r.id!, n)
    setMsg('저장했어요')
  }
  const toggleTyping = async (on: boolean) => { setTyping(on); await setSetting('blankInputMode', on ? 'typing' : 'choice') }
  const doExport = async () => {
    const blob = new Blob([await exportAll()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `hajun-words-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const doImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      await importAll(await f.text())
      await refreshRange(); await reload()
      setMsg('가져왔어요')
    } catch (err) {
      setMsg(err instanceof Error ? err.message : '가져오기 실패')
    } finally {
      e.target.value = ''
    }
  }
  const doReset = async () => {
    if (!window.confirm('모든 진도를 지울까요? 되돌릴 수 없어요.')) return
    await resetProgress(); await refreshRange(); await reload()
    setMsg('초기화했어요')
  }

  return (
    <main className="page stack">
      <div className="topbar"><Link to="/">← 홈</Link><span>설정</span><span /></div>
      {msg && <p className="muted">{msg}</p>}
      <h2>학원 점수</h2>
      <div className="card stack">
        {ranges.length === 0 && <p className="muted">아직 범위가 없어요.</p>}
        {ranges.map((r) => (
          <div className="row" key={r.id} style={{ justifyContent: 'space-between' }}>
            <span>{r.name}</span>
            <input className="input" style={{ width: 90 }} type="number" min={0} max={100} aria-label={`${r.name} 학원 점수`}
              defaultValue={r.academyScore ?? ''} onBlur={(e) => saveScore(r, e.target.value)} />
          </div>
        ))}
      </div>
      <h2>공부 방식</h2>
      <label className="card row"><input type="checkbox" aria-label="빈칸 직접 입력" checked={typing} onChange={(e) => toggleTyping(e.target.checked)} /> 빈칸 직접 입력 (끄면 보기에서 고르기)</label>
      <h2>진도 옮기기</h2>
      <div className="card stack">
        <button className="btn btn-block" onClick={doExport}>내보내기 (JSON 저장)</button>
        <label className="btn btn-block">가져오기 (JSON 선택)<input type="file" accept="application/json" style={{ display: 'none' }} onChange={doImport} /></label>
      </div>
      <h2>위험 구역</h2>
      <button className="btn btn-bad btn-block" onClick={doReset}>진도 초기화</button>
    </main>
  )
}
```

`src/app/App.tsx`: `import Settings from '../screens/Settings'`, `/settings` → `<Settings />`. 이 시점에 `Placeholder` import는 `/match`·`/sentence`가 라우트에 없으므로 제거.

- [ ] **Step 4: 통과 확인·전체 테스트**

Run: `npm test -- --run`
Expected: 모든 테스트 통과(약 50개).

Run: `npm run build`
Expected: 타입 오류 없음.

- [ ] **Step 5: 커밋**

```bash
git add src/screens/Settings.tsx src/screens/Settings.test.tsx src/app/App.tsx
git commit -m "feat: 설정 화면 (학원 점수·입력 방식·내보내기/가져오기·초기화)"
```

---

### Task 15: PWA 설정

**Files:**
- Modify: `vite.config.ts`, `src/main.tsx`
- Create: `public/icon.svg`

**Interfaces:**
- Produces: 오프라인 캐시(앱 셸 precache, `content/` NetworkFirst), 홈 화면 추가용 manifest. `registerType: 'autoUpdate'`로 새 빌드가 있으면 자동 갱신.

- [ ] **Step 1: 아이콘과 설정 작성**

`public/icon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#2563eb"/>
  <text x="256" y="330" font-family="Arial, sans-serif" font-size="260" font-weight="700" fill="#fff" text-anchor="middle">W</text>
</svg>
```

`vite.config.ts` 전체 교체:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/hajun-words/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: '하준 영어단어',
        short_name: '영어단어',
        lang: 'ko',
        start_url: '/hajun-words/',
        scope: '/hajun-words/',
        display: 'standalone',
        background_color: '#f6f7fb',
        theme_color: '#2563eb',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        navigateFallback: '/hajun-words/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/hajun-words/content/'),
            handler: 'NetworkFirst',
            options: { cacheName: 'content', expiration: { maxEntries: 50 } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
  },
})
```

`src/main.tsx` 상단에 추가:
```ts
import { registerSW } from 'virtual:pwa-register'
registerSW({ immediate: true })
```
`tsconfig.json`의 `types`에 `"vite-plugin-pwa/client"` 추가:
```json
"types": ["vite/client", "vite-plugin-pwa/client"]
```

- [ ] **Step 2: 빌드·확인**

Run: `npm run build`
Expected: `dist/sw.js`, `dist/manifest.webmanifest` 생성.

Run: `npm run preview` 후 `http://localhost:4173/hajun-words/` 열기 → 개발자 도구 Application 탭에서 Service Worker 활성, Manifest에 "하준 영어단어". 네트워크를 Offline으로 바꾸고 새로고침해도 홈이 뜸.

- [ ] **Step 3: 커밋**

```bash
git add vite.config.ts src/main.tsx tsconfig.json public/icon.svg
git commit -m "feat: PWA (오프라인 캐시·홈 화면 추가)"
```

---

### Task 16: GitHub Pages 배포

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

- [ ] **Step 1: 워크플로 작성**

`.github/workflows/deploy.yml`:
```yaml
name: Deploy
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run validate
      - run: npm test -- --run
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

`README.md`:
```markdown
# 하준 영어단어

단어장 사진 → 파생 트리 단어장 → 빈칸·뜻 고르기·모의시험 PWA.

## 아빠용 사용법
1. 단어장 사진을 `photos/inbox/`에 넣는다.
2. Claude Code에서 `/add-words --bank <뱅크id>` 실행. 추출 목록을 확인하고 승인한다.
3. `git add -A && git commit -m "content: Day N~M" && git push` → 1~2분 뒤 배포.
4. 아이 폰에서 `https://<계정>.github.io/hajun-words/` 를 열고 홈 화면에 추가.

## 개발
- `npm run dev` 개발 서버 · `npm test` 테스트 · `npm run validate` 콘텐츠 검증 · `npm run build` 빌드
- 설계: `docs/superpowers/specs/2026-10-15-hajun-words-design.md`
```

- [ ] **Step 2: 저장소 생성·푸시·Pages 활성화**

Run (공개 저장소. 무료 계정의 Pages 조건. `photos/`는 .gitignore라 사진은 올라가지 않음):
```bash
git branch -M main
gh repo create hajun-words --public --source=. --remote=origin --push
gh api -X POST repos/{owner}/hajun-words/pages -f build_type=workflows
```
Expected: 저장소 생성, 첫 푸시로 `Deploy` 워크플로 실행. 두 번째 명령이 409(이미 설정됨)면 무시.

Run: `gh run watch` (또는 `gh run list --limit 1`)
Expected: build·deploy 성공.

- [ ] **Step 3: 배포 확인**

브라우저에서 `https://<계정>.github.io/hajun-words/` 열기 → 홈 화면, 범위 선택, 빈칸 한 회차가 동작. 폰에서도 열어 "홈 화면에 추가".

- [ ] **Step 4: 커밋**

```bash
git add .github/workflows/deploy.yml README.md
git commit -m "ci: GitHub Pages 배포 워크플로, README"
git push
```

---

### Task 17: 콘텐츠 병합 스크립트와 `/add-words` 스킬

**Files:**
- Create: `src/content/merge.ts`, `scripts/merge-words.ts`, `.claude/skills/add-words/SKILL.md`, `photos/inbox/.gitkeep`(gitignore 대상이라 커밋되지 않음, 폴더만 생성), `content-work/README.md`(gitignore 대상)
- Test: `src/content/merge.test.ts`

**Interfaces:**
- Consumes: `Bank`, `NewWord`, `NewWordSchema`, `BankSchema`(Task 2), `validateBank`(Task 2)
- Produces:
  ```ts
  mergeWords(bank: Bank | null, meta: { id: string; title: string }, newWords: NewWord[]): Bank
  // 기존 id면 source에 ", <라벨>" 덧붙임(이미 포함돼 있으면 그대로). 새 id면 no = max+1.
  ```
  CLI: `npm run merge -- --bank <id> [--title "<제목>"] <chunk.json>` — chunk는 `{ "words": NewWord[] }`. 병합 결과를 검증해 오류가 있으면 파일을 쓰지 않고 exit 1. 정상이면 뱅크 파일과 `index.json` 갱신.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/content/merge.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mergeWords } from './merge'
import type { Bank, NewWord } from './schema'

const nw = (id: string, source: string): NewWord => ({
  id, source, word: id, pos: '', ipa: '', core: { ko: 'c', en: 'c' },
  senses: [{ ko: 'k', en: 'e', bridge: '', example: `a ${id} b`, blank: 'a ____ b' }], koGenerated: false, image: null, etymology: null,
})

describe('mergeWords', () => {
  it('creates a bank from scratch with numbering from 1', () => {
    const b = mergeWords(null, { id: 'wm', title: 'WM' }, [nw('run', 'Day 1'), nw('fine', 'Day 1')])
    expect(b.id).toBe('wm')
    expect(b.words.map((w) => [w.id, w.no])).toEqual([['run', 1], ['fine', 2]])
  })
  it('appends to an existing bank and merges duplicate ids by source', () => {
    const existing: Bank = mergeWords(null, { id: 'wm', title: 'WM' }, [nw('run', 'Day 1')])
    const b = mergeWords(existing, { id: 'wm', title: 'WM' }, [nw('run', 'Day 3'), nw('bank', 'Day 3'), nw('run', 'Day 3')])
    expect(b.words.map((w) => [w.id, w.no, w.source])).toEqual([['run', 1, 'Day 1, Day 3'], ['bank', 2, 'Day 3']])
    expect(existing.words[0].source).toBe('Day 1')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- --run src/content/merge`
Expected: FAIL, 모듈 없음.

- [ ] **Step 3: 구현**

`src/content/merge.ts`:
```ts
import type { Bank, NewWord, Word } from './schema'

export function mergeWords(bank: Bank | null, meta: { id: string; title: string }, newWords: NewWord[]): Bank {
  const words: Word[] = bank ? bank.words.map((w) => ({ ...w })) : []
  const byId = new Map(words.map((w) => [w.id, w]))
  let next = words.reduce((m, w) => Math.max(m, w.no), 0) + 1
  for (const nw of newWords) {
    const existing = byId.get(nw.id)
    if (existing) {
      const labels = existing.source.split(',').map((s) => s.trim()).filter(Boolean)
      const label = nw.source.trim()
      if (label && !labels.includes(label)) existing.source = [...labels, label].join(', ')
      continue
    }
    const w: Word = { ...nw, no: next++ }
    words.push(w)
    byId.set(w.id, w)
  }
  return { id: meta.id, title: bank?.title ?? meta.title, words }
}
```

`scripts/merge-words.ts`:
```ts
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
```

`.claude/skills/add-words/SKILL.md`:
````markdown
---
name: add-words
description: photos/inbox/ 의 단어장 사진을 읽어 단어·뜻을 추출하고, 핵심 의미·파생 가지·예문·영영 뜻을 생성해 뱅크 JSON에 병합한다. "/add-words --bank <id> [--title <제목>]" 로 호출.
---

# /add-words

인자: `--bank <뱅크id>` (필수), `--title "<제목>"` (새 뱅크일 때). 인자가 없으면 먼저 물어본다.

## 1. 추출

1. `photos/inbox/` 의 이미지 파일을 파일명 순으로 Read 도구로 읽는다.
2. 각 사진에서 **단어, 품사, 교재에 적힌 한국어 뜻(순서 그대로), Day/페이지 라벨**을 추출한다. 라벨이 안 보이면 직전 사진의 라벨을 잇는다.
3. 결과를 아래 표로 보여주고 **멈춘다**. 사용자가 승인하기 전에는 다음 단계로 가지 않는다.

| # | 단어 | 품사 | 교재 뜻 | 라벨 |
|---|------|------|---------|------|

사용자가 수정을 요청하면 반영해 다시 보여준다.

## 2. 생성 (승인 후)

단어 10개씩 끊어 `content-work/chunk-<n>.json` 에 `{ "words": [...] }` 형식으로 쓴다. 각 항목은 `src/content/schema.ts` 의 `NewWordSchema`(= Word에서 `no` 제외)를 따른다.

생성 규칙:
- `id`: 철자 소문자. `word`: 원형 철자. `pos`: 교재 표기. `ipa`: 미국식.
- `senses[].ko`: **교재 뜻을 그대로.** 사진에 뜻이 없을 때만 생성하고 그 단어에 `koGenerated: true`. 뜻 하나에 표현 하나(쉼표로 여러 표현 나열 금지, 괄호 힌트는 허용).
- `core.ko` / `core.en`: 모든 가지를 설명할 수 있는 핵심 이미지 한 줄. 억지로 묶지 않는다.
- `senses[].bridge`: 핵심에서 그 뜻으로 가는 한 줄("가게가 쭉 굴러가면"). 다른 어원이면 `"다른 뿌리: ..."` 로 솔직히 쓰고 `etymology` 에 보충.
- `senses[].en`: Learner's dictionary 수준의 쉬운 영어 정의.
- `senses[].example`: 초등 고학년 수준, 10단어 안팎, 그 뜻이 문맥만으로 드러나게. 단어는 문장에 맞는 형태로(runs, ran).
- `senses[].blank`: `example` 에서 그 단어 형태만 `____` 로 바꾼 것. 다른 글자는 한 글자도 바꾸지 않는다.
- `image: null`, `etymology`: 어원이 뜻 구별에 도움될 때만, 아니면 `null`.

## 3. 병합·검증

청크마다:
```
npm run merge -- --bank <id> [--title "<제목>"] content-work/chunk-<n>.json
```
오류가 나면 해당 단어만 고쳐 다시 실행한다. 모두 끝나면 `npm run validate` 로 전체 확인.

## 4. 마무리

1. 요약을 보여준다: 추가된 단어 수, 뜻 개수 분포(1개/2개/3개/4개+), 무작위 3개 샘플의 트리(핵심 → 가지).
2. `photos/inbox/*` 를 `photos/done/` 로 옮긴다. `content-work/chunk-*.json` 은 지운다.
3. 커밋·푸시는 사용자에게 맡긴다. 명령을 안내한다:
   `git add -A && git commit -m "content: <라벨 범위>" && git push`
````

`content-work/README.md`:
```markdown
/add-words 가 쓰는 임시 청크 폴더. git에 올라가지 않음.
```

폴더 생성:
```bash
mkdir -p photos/inbox photos/done content-work
```

- [ ] **Step 4: 통과 확인·CLI 확인**

Run: `npm test -- --run src/content/merge`
Expected: 2 passed.

CLI 확인용 청크 `content-work/try.json`:
```json
{ "words": [ { "id": "spring", "source": "Day 3", "word": "spring", "pos": "n., v.", "ipa": "/sprɪŋ/",
  "core": { "ko": "튀어 오르다", "en": "to jump up suddenly" },
  "senses": [
    { "ko": "봄", "en": "the season after winter", "bridge": "새싹이 튀어 오르는 계절", "example": "Flowers bloom in spring.", "blank": "Flowers bloom in ____." },
    { "ko": "용수철", "en": "a coil of metal that bounces back", "bridge": "눌렀다 놓으면 튀어 오름", "example": "The spring in the pen broke.", "blank": "The ____ in the pen broke." }
  ], "koGenerated": false, "image": null, "etymology": null } ] }
```
Run: `npm run merge -- --bank sample content-work/try.json`
Expected: `✓ banks/sample.json: 1개 추가, 총 11단어`. `npm run validate` 통과.

확인 후 되돌리기: `git checkout public/content && rm content-work/try.json`.

- [ ] **Step 5: 커밋**

```bash
git add src/content/merge.ts src/content/merge.test.ts scripts/merge-words.ts .claude/skills/add-words/SKILL.md
git commit -m "feat: 단어 병합 스크립트와 /add-words 스킬"
git push
```

---

### Task 18: 최종 검증

**Files:** 없음 (검증만)

- [ ] **Step 1: 전체 자동 검증**

Run: `npm run validate && npm test -- --run && npm run build`
Expected: 모두 통과.

- [ ] **Step 2: 배포본에서 끝까지 한 번**

`https://<계정>.github.io/hajun-words/` 에서:
1. 범위 Day 1~2 저장 → 홈에 10단어.
2. 파생 트리 3장 넘기기 → 홈 "본 적 있음 3".
3. 빈칸 1회차, 뜻 고르기 1회차 → "오늘 20문제", "1일 연속".
4. 모의시험 → 점수 → 틀린 단어 트리 이동.
5. 설정 → 학원 점수 90 입력 → 기록 화면에 "최고 · 90".
6. 내보내기 → 진도 초기화 → 가져오기 → 기록 복원.
7. 폰에서 열어 홈 화면 추가, 비행기 모드에서 홈 열림.

- [ ] **Step 3: 스펙 대조**

스펙 10장 "1차(MVP)" 항목을 하나씩 체크. 빠진 항목이 있으면 해당 Task로 돌아간다.
