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
