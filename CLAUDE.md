# 하준 영어단어 (hajun-words)

초6 아들의 학원 영어 단어 시험 대비용 개인 PWA. Vite + React + TypeScript, Dexie, zod, Vitest. 서버·로그인 없음. 콘텐츠는 `public/content/` JSON, 진도는 기기 IndexedDB.

## 반드시 읽을 문서
- 설계: `docs/superpowers/specs/2026-10-15-hajun-words-design.md`
- 구현 계획: `docs/superpowers/plans/2026-10-15-hajun-words-mvp.md` (Task 1~18, 각 Task에 테스트·코드·커밋 명령이 들어 있음)

## 작업 규칙
- 계획의 Task를 **번호 순서대로** 구현한다. Task 1(스캐폴드)과 Task 2(스키마)가 끝나야 나머지를 시작할 수 있다. Task 3·4·5(순수 로직)는 서로 독립이라 병렬 가능. Task 6·7(저장소)은 3 이후. Task 8 이후 화면은 2~7 이후.
- 각 Task는 "실패 테스트 작성 → 실패 확인 → 구현 → 통과 확인 → 커밋" 순서를 지킨다. 계획에 적힌 코드를 그대로 쓰되, 계획과 실제가 어긋나면(타입 오류, API 변경) 계획을 고치지 말고 코드를 맞추고 커밋 메시지에 한 줄 적는다.
- 인터페이스(함수 이름·시그니처·타입)는 계획의 **Interfaces** 블록을 따른다. 다른 Task가 그 이름을 쓴다.
- 테스트: `npm test -- --run <경로>`. 전체: `npm test -- --run`. 콘텐츠 검증: `npm run validate`. 빌드: `npm run build`.
- UI 문구는 한국어 "~해요" 체. 빈칸 표기는 `____`.
- `photos/`, `content-work/`는 git에 올리지 않는다.
- Task 16(배포)의 `gh repo create`·`git push`는 리더가 직접 하거나 사용자 확인 후 실행한다.

## 커밋
- 메시지: `feat:`/`chore:`/`docs:`/`ci:` 접두어 + 한국어 설명.
- 끝에 반드시 두 줄:
  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01UsTYHJBdDm6zW6qWLfvfTi
  ```

## 환경
- Windows 11, Node 24, npm 11, git, gh(로그인됨). tmux 없음 → 팀원은 in-process.
- 폴더명이 한글이므로 package.json `name`은 `hajun-words`.
