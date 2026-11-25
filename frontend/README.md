# AnswerFit 프론트엔드

Next.js 16(App Router, Cache Components) + CSS Modules + TypeScript.

## 실행

```bash
npm install
npm run dev          # http://localhost:3000
npm run build
npm run typecheck
npm run lint         # import 경계(B1~B8) 포함
npm run structure    # 배치 규칙(R0~R6)
npm test             # 단위 테스트
```

## 환경 변수

`.env.example`을 `.env.local`로 복사해 쓴다.

| 이름 | 설명 |
| --- | --- |
| `APP_ENV` | `local`·`test`에서만 푸터에 모드 전환기가 보인다. `production`에서는 숨기고 항상 실제 API를 쓴다. 없으면 `npm run dev`는 `local`, 빌드 결과는 `production`과 같다 |
| `BACKEND_URL` | 개발 모드에서 부를 백엔드 주소 |

## 데이터 모드

푸터에서 고르고 쿠키에 남는다. 푸터가 없는 화면에서도 고른 모드가 유지된다.

| 모드 | 동작 |
| --- | --- |
| 목업 데이터 모드(기본) | `demo/`의 데이터를 쓴다. 비회원·회원·관리자 역할도 바꿀 수 있다 |
| 개발 모드 | 백엔드 API를 부른다. 아직 없는 API는 목업으로 대신하지 않고 오류를 보여 준다 |

## 폴더 구조

```text
app/                   라우트와 그 라우트만 쓰는 코드
  _components/         앱 공통 부품
  (site)/              푸터가 있는 일반 화면
  (interview)/         푸터가 없는 면접 진행 화면
components/ui/         도메인·URL을 모르는 범용 UI
features/<도메인>/     api.ts(데이터 접근), actions.ts(서버 액션), types.ts, components/
demo/                  목업 데이터와 시연 기록, 모드 전환기. API 연동이 끝나면 지운다
lib/                   도메인을 모르는 기반 함수
scripts/structure/     배치·import 경계 검사
tests/unit/            단위 테스트
```

### 아직 목업인 것

- 시선 인식과 "얼굴이 가이드 안에 있어요"는 목업 모드에서만 연결된 것처럼 보인다. 개발 모드에서는 "준비 중"으로 보인다.
- 답변을 글자로 바꾸는 것과 분석 단계는 시간에 맞춰 보여 준다.
- 질문별 녹화는 실제로 하지만 이 탭의 메모리(`features/interview/recordings.ts`)에만 남는다.
- 질문 읽기는 브라우저 내장 음성을 쓴다.

### API를 연동할 때

1. `features/<도메인>/api.ts`의 개발 모드 분기를 확정된 형식에 맞춘다. 화면은 고치지 않는다.
2. 확인이 끝나면 그 도메인의 목업 분기와 `demo/<도메인>.ts`를 지운다.

### 배치 기준

| 규칙 | 코드의 성격 | 위치 |
| --- | --- | --- |
| P1 | 시연 데이터·시연 기록·전환기 | `demo/` |
| P2 | 도메인의 조회·저장·액션·타입·검사 | `features/<도메인>/` |
| P3 | 도메인을 모르는 기반 함수 | `lib/` |
| P4 | 라우트 하나만 쓰는 부품 | 그 라우트의 `_components/` |
| P5 | 한 구역의 여러 라우트가 쓰는 부품 | 공통 조상의 `_components/` |
| P6 | 여러 구역이 쓰는 부품 | 도메인 부품은 `features/*/components`, 범용 UI는 `components/ui`, 라우트 의존 부품은 `app/_components` |
| P7 | 라우트 전용 순수 함수 | 그 구역의 `_lib/` |

부품은 이름과 같은 폴더에 두고 `…/Button/Button`처럼 파일까지 import한다.

### import 경계

| 규칙 | 허용하지 않는 의존 |
| --- | --- |
| B1 | `components/ui` → `app`, `features`, `demo`, `lib/backend.ts` |
| B2 | `lib` → `app`, `features`, `components`, `demo` |
| B3 | `features` → `app` |
| B4 | `features`에서 `*/api.ts`·`session/session.ts` 이외의 파일 → `demo` |
| B5 | 다른 도메인의 `actions.ts` 호출 |
| B6 | `features/session` → 다른 도메인 |
| B7 | 다른 도메인 → `features/auth` |
| B8 | 부품 폴더의 `api.ts` → `demo`, 백엔드 통신 |

도메인을 더하면 `scripts/structure/eslint-boundaries.mjs`의 `DOMAINS`에도 더한다.

### 스타일

- 색·간격·글자·모서리·모션 값은 `app/globals.css`의 토큰을 쓴다(R5). 너비·높이 같은 부품 고유 크기는 예외다.
- 미디어 쿼리 너비는 40·48·64·80rem만 쓴다.
