# 하준 영어단어

단어장 사진 → 파생 트리 단어장 → 빈칸·뜻 고르기·모의시험 PWA.

## 아빠용 사용법

### 폰에서 (사진 첨부)
1. 폰 브라우저에서 claude.ai/code 를 열고 이 저장소(`hajun-words`)로 세션을 시작한다.
2. 단어장 사진을 대화에 첨부하고 `/add-words --bank <뱅크id> --title "<제목>"` 을 입력한다. (뱅크가 이미 있으면 `--title` 생략)
3. 추출 목록 표를 확인하고 승인한다. 생성·검증이 끝나면 "푸시해"라고 답한다 → 1~2분 뒤 배포.

### PC에서 (폴더에 넣기)
1. 단어장 사진을 `photos/inbox/`에 넣는다.
2. Claude Code에서 `/add-words --bank <뱅크id>` 실행. 추출 목록을 확인하고 승인한다.
3. `git add -A && git commit -m "content: Day N~M" && git push` → 1~2분 뒤 배포.

### 아이 폰
`https://daeung-yoon.github.io/hajun-words/` 를 열고 홈 화면에 추가. 새 단어장이 올라오면 새로고침 한 번.

## 개발
- `npm run dev` 개발 서버 · `npm test` 테스트 · `npm run validate` 콘텐츠 검증 · `npm run build` 빌드
- 설계: `docs/superpowers/specs/2026-10-15-hajun-words-design.md`
