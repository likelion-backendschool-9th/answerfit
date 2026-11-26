# 질문 아카이브 조회 연결

[문제은행 백엔드 청사진](../../backend/question/README.md)의 QB-10에 해당한다. 화면 URL `/archive`와 `/archive/{id}`, 기존 레이아웃과 스타일을 유지하면서 [카테고리](../../backend/question/categories.md)·[목록](../../backend/question/list.md)·[상세](../../backend/question/detail.md) 계약을 연결한다.

## 데이터 조회와 주소

브라우저는 Next 서버를 통해 조회한다. 기존 `BACKEND_URL`과 httpOnly access-token 쿠키의 Bearer 전달을 사용하며, 회원 확인은 기존 `requireMember`를 거친다. API 모드 실패를 목업이나 빈 목록으로 대체하지 않는다.

목록은 카테고리를 `GET /api/v1/categories`로 조회한 뒤 현재 대분류의 분류 ID를 확인한다. `GET /api/v1/learning/questions`에 major·categoryId·keyword·likedOnly·sort·page·pageSize를 보낸다. 기본 페이지 크기는 7이며 검색어는 공백 정리 후 최대 100 code point로 전달한다. 카테고리 ID는 문자열로 유지한다.

새 분야 링크의 category 값은 분류 ID다. 기존 한글 이름으로 저장한 URL도 현재 대분류의 카테고리 응답 안에서 이름을 ID로 변환해 처리한다. 다른 대분류의 분류나 없는 분류는 오류로 처리하며 선택 조건을 조용히 해제하지 않는다. 카테고리 응답의 순서·0건 분류·분류별 공개 건수를 그대로 표시한다.

목록 items의 순서를 다시 정렬하거나 검색·페이지 처리를 반복하지 않는다. 전체 건수·대분류 건수·현재 페이지·전체 페이지는 서버 응답을 사용한다. 요청 페이지가 보정되면 페이지 UI와 이후 링크도 서버가 반환한 실제 페이지를 사용한다. 분야 칩의 건수는 검색 결과 건수가 아니라 해당 분류 전체 공개 건수다.

상세는 ID로 `GET /api/v1/learning/questions/{id}`를 직접 호출한다. 공개 목록에 없는 본인 대기·반려 질문도 조회할 수 있다. 앞뒤 질문은 상세 응답의 previous/next만 사용한다. `404 QUESTION_NOT_FOUND`는 없는 화면으로 표시하고, 다른 인증·권한·서버·미연동 오류는 기존 오류 처리로 전달한다.

## 응답과 화면 상태

서버 응답 타입과 화면 변환은 `features/question/read-model.ts`에 모은다. Java Long ID를 숫자로 바꾸지 않는다. CS/PERSONALITY와 PENDING/APPROVED/REJECTED를 화면 값으로 변환하고, 등록·검토 시각은 KST 날짜로 표시한다. HIDDEN 응답을 승인 질문으로 해석하지 않는다.

중분류가 null인 인성 질문은 대분류 이름을 표시하며 상세의 중분류 경로 링크를 생략한다. 모범답안은 첫 문단을 summary, 남은 문단을 body로 변환하고 서버 키워드를 유지한다. 서버에 없는 비교표는 만들지 않는다. 목업이 가진 기존 비교표는 목업 모드에서 유지한다.

반려는 승인대기와 별도로 표시하며 반려 사유와 수정 후 같은 질문으로 재제출된다는 안내를 제공한다. 상세의 수정·삭제·신고 버튼은 서버 권한 필드를 따른다. 승인 질문에만 좋아요를 표시한다. 답안 생성 중·생성 실패·답안 없음도 서로 다른 안내를 제공한다. 승인 즉시 질문은 공개되며 답안은 이후 생성될 수 있다.

## 기존 전체 배열 소비자

공개 목록의 첫 페이지를 기존 전체 데이터 자리에 넣지 않는다.

| 소비자 | 분리한 조회 | 유지하는 범위 |
| --- | --- | --- |
| 내 질문 | getMyQuestions | 본인 질문 전체와 상태별 탭 |
| 내 좋아요·대시보드 | getMyLikedQuestions | 좋아요 질문 전체와 전체 건수 |
| 등록 폼의 유사 질문 | getSimilarityCandidates | 기존 승인 CS 후보 집합 |
| QB-11 변경 액션의 사전 확인 | 기존 getQuestion | 기존 전체 배열을 이용한 경로 |

위 조회는 기존 `/api/questions` 계약과 목업을 유지한다. 회원 담당의 `my-114`·`my-105`·`my-106` API가 연결되기 전까지 해당 화면이 실제 백엔드와 연결됐다고 보지 않는다. 유사 질문 후보 선정과 변경 액션의 경로·메서드·요청 변환은 QB-11에서 바꾼다.

목업 아카이브도 공개 승인 질문만 목록·집계에 포함한다. 본인 미승인 질문은 직접 상세와 내 질문에서 볼 수 있다. 목업의 로컬 검색·페이지 처리는 API 모드와 분리한다.

## 검증과 인증 연계 조건

단위 테스트에서 응답 변환, 큰 문자열 ID, KST 날짜, nullable 분류, 반려·답안 상태, 서버 권한과 이웃 질문을 확인한다. 조회 adapter 테스트는 고정된 응답으로 요청 URL·Bearer 전달·서버 정렬 및 페이지 결과 존중·오류 구분·기존 전체 데이터 소비자 보존을 확인한다. 이는 실제 로그인 서버를 검증하는 테스트가 아니다.

현재 작업 브랜치의 백엔드에는 로그인·회원 세션 API와 토큰을 QuestionPrincipal로 바꾸는 처리 구현이 없다. 프론트는 `/api/auth/login`·`/api/members/me`를 사용하지만 이 경로와 WBS의 `/api/v1/users/me`는 현재 백엔드에 구현되어 있지 않다.

별도 `origin/feature/email-signup`의 로컬 ref에는 JWT 검증과 `GET /api/v1/members/me` 구현이 있다. 해당 브랜치는 `success/data/error` envelope와 이미 변환된 member/admin 세션 역할을 사용하므로 현재 flat 응답 가정·세션 경로와 함께 조정해야 한다. 검증된 JWT 인증 객체도 질문의 `QuestionPrincipal`과 다르므로 현재 User 계정 상태를 반영하는 adapter가 필요하다. 이 브랜치의 인증 기능은 QB-10 조회 연결에 임의 병합하지 않는다.

조회 연결에서 인증 우회용 헤더·임시 principal·목업 자동 대체를 추가하지 않는다. 실제 개발 모드의 로그인 → 목록/상세 검증은 인증 담당의 API·principal 연계 후 수행하고, 그때 QB-10 완료 기준을 확인한다. 관리자·AI 연계를 포함한 전체 흐름은 QB-12에서 검증한다.
