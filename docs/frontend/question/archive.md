# 질문 아카이브 조회 연결

[문제은행 백엔드 청사진](../../backend/question/README.md)의 QB-10에 해당한다. 화면 URL `/archive`와 `/archive/{id}`, 기존 레이아웃과 스타일을 유지하면서 [카테고리](../../backend/question/categories.md)·[목록](../../backend/question/list.md)·[상세](../../backend/question/detail.md) 계약을 연결한다.

## 데이터 조회와 주소

브라우저는 Next 서버를 통해 조회한다. `BACKEND_URL`과 httpOnly access-token 쿠키의 Bearer 전달을 사용하며, 회원 확인은 `requireMember`와 `GET /api/v1/members/me`를 거친다. API 모드 실패를 목업이나 빈 목록으로 대체하지 않는다.

인증·회원 API는 공통 `success/data/error` envelope를 사용한다. 기존 문제은행은 flat 응답 계약을 유지하므로 해당 도메인의 호출만 `responseFormat: "plain"`을 명시한다. 같은 요청이라도 Security 필터와 전역 오류는 envelope로 올 수 있어 두 형식을 구분해 처리한다. 그 밖의 호출은 기존처럼 envelope 성공만 허용한다.

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

위 조회는 인증 브랜치의 버전 경로 정리에 맞춘 기존 `/api/v1/questions` 계약과 목업을 유지한다. 회원 담당의 `my-114`·`my-105`·`my-106` API가 연결되기 전까지 해당 화면이 실제 백엔드와 연결됐다고 보지 않는다. 유사 질문 후보 선정과 변경 액션의 경로·메서드·요청 변환은 QB-11에서 바꾼다.

목업 아카이브도 공개 승인 질문만 목록·집계에 포함한다. 본인 미승인 질문은 직접 상세와 내 질문에서 볼 수 있다. 목업의 로컬 검색·페이지 처리는 API 모드와 분리한다.

## 검증과 인증 연계 조건

단위 테스트에서 응답 변환, 큰 문자열 ID, KST 날짜, nullable 분류, 반려·답안 상태, 서버 권한과 이웃 질문을 확인한다. 조회 adapter 테스트는 고정된 응답으로 요청 URL·Bearer 전달·서버 정렬 및 페이지 결과 존중·오류 구분·기존 전체 데이터 소비자 보존을 확인한다. 이는 실제 로그인 서버를 검증하는 테스트가 아니다.

사용자가 요청한 `origin/feature/email-signup`을 통합해 카카오 로그인·JWT 발급 및 검증·`GET /api/v1/members/me`를 연결했다. 세션은 실제 구현의 member/admin 값을 사용하며 WBS의 `/api/v1/users/me`로 임의 변경하지 않는다. 카카오 설정과 callback 등록은 [로그인 문서](../user/login.md)를 따른다. 이메일 로그인·다른 소셜 제공자의 후속 구현까지 완료한 것으로 보지 않는다.

JWT 서명·만료·issuer 검증을 통과한 뒤 `QuestionJwtAuthenticationConverter`가 현재 DB 회원을 조회한다. `QuestionJwtAuthenticationToken`은 기존 Jwt principal을 유지하면서 QuestionPrincipal의 회원 ID·DB 역할·계정 상태를 제공한다. 토큰의 오래된 role 값으로 현재 DB 권한을 덮어쓰지 않는다. 탈퇴·없는 회원·잘못된 subject는 401, 질문 API의 이용 정지는 403이다. 일반 Principal이나 임의 헤더를 회원 인증으로 바꾸지 않는다.

질문 한정 오류 처리에 우선순위를 지정해 전역 예외 처리와 함께 있어도 기존 업무 오류 코드를 유지한다. 기존 질문 MVC 테스트는 검증된 principal 소비 계약에 집중하며, 별도 실제 JWT 테스트는 Security 필터·디코더·DB 회원 상태와 카카오 로그인 서비스부터 질문 조회까지의 연결을 검증한다. 이때 외부 KakaoClient만 고정 응답으로 대체하며 사용자 계정의 실제 OAuth 동의는 자동 실행하지 않는다.

카카오 운영 설정과 실제 계정을 사용한 브라우저 로그인 확인, 관리자·AI 연계를 포함한 전체 흐름은 QB-12에서 검증한다.

최종 검증은 프론트 단위 테스트 267개, typecheck·lint·structure·production build와 백엔드 build·테스트 614개가 통과했다. 백엔드에는 실제 JWT 통합 테스트 15개가 포함된다. 브라우저 미리보기는 이 실행 환경의 브라우저 연결 호스트가 제공되지 않아 확인하지 못했다.
