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
