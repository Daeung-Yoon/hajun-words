# 하준 영어단어

단어장 사진 → 파생 트리 단어장 → 빈칸·뜻 고르기·모의시험 PWA.

## 아빠용 사용법

### 폰에서 (사진 첨부)
1. 폰 브라우저에서 claude.ai/code 를 열고 이 저장소(`hajun-words`)로 세션을 시작한다.
2. 단어장 사진을 대화에 첨부하고 `/add-words --bank <뱅크id> --title "<제목>"` 을 입력한다. (뱅크가 이미 있으면 `--title` 생략)
3. 추출 목록 표를 확인하고 승인한다. 생성·검증이 끝나면 "푸시해"라고 답한다 → 1~2분 뒤 배포.

### PC에서 (Google Drive 로 사진 보내기)
1. 폰 Google Drive 앱에서 단어장 사진을 `내 드라이브/하준단어장/inbox/` 에 올린다. (PC에 직접 넣을 때는 `photos/inbox/`)
2. PC에서 Drive for Desktop 이 켜져 있는지 확인하고, Claude Code에서 `/add-words --bank <뱅크id>` 실행. Drive 사진을 자동으로 가져와 추출 목록을 보여 주면 확인하고 승인한다.
3. 끝나면 처리한 사진은 Drive 에서도 `하준단어장/done/` 으로 옮겨진다.
4. `git add -A && git commit -m "content: Day N~M" && git push` → 1~2분 뒤 배포.

수동으로 가져오기만 하려면 `npm run photos -- pull`, 처리 완료 정리는 `npm run photos -- done`. Drive 폴더를 못 찾으면 `--from "H:\내 드라이브"` 처럼 경로를 준다.

### 아이 폰
`https://daeung-yoon.github.io/hajun-words/` 를 열고 홈 화면에 추가. 새 단어장이 올라오면 새로고침 한 번.

## 개발
- `npm run dev` 개발 서버 · `npm test` 테스트 · `npm run validate` 콘텐츠 검증 · `npm run build` 빌드
- 설계: `docs/superpowers/specs/2026-10-15-hajun-words-design.md`
