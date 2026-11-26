# 문제은행 질문 신고

WBS `problem-bank-109`, [청사진의 QB-09](README.md#7-브랜치별-todo와-구현-순서)에 해당한다. 기존 `QuestionReport`와 회원별 신고 유일 제약을 사용한다.

## 요청과 응답

`POST /api/v1/learning/questions/{questionId}/reports`, `Content-Type: application/json`.

```json
{"reasonType":"WRONG_QUESTION","detail":"질문에 전제된 사실을 확인해 주세요."}
```

`questionId`는 양의 Long이며, 회원 ID는 [검증된 principal](contracts.md#회원-식별-경계)에서 가져온다. 요청의 reporterId·questionId·status·handledBy나 별도 사용자 헤더·쿼리로 신고 대상·신원·처리 상태를 바꿀 수 없다.

| reasonType | 기존 화면 문구 |
| --- | --- |
| `WRONG_QUESTION` | 질문 내용이 사실과 달라요 |
| `WRONG_ANSWER` | 모범답안이 틀렸어요 |
| `DUPLICATE` | 이미 있는 질문과 중복돼요 |
| `INAPPROPRIATE` | 부적절한 표현이 있어요 |
| `ETC` | 기타 |

`reasonType`은 위 코드 중 하나가 필수다. 대소문자와 양 끝 공백을 보정하지 않는다. `detail`은 생략·null·빈 문자열을 허용하고 모두 빈 문자열로 저장한다. NBSP·BOM을 포함한 양 끝 공백을 제거한 뒤 최대 300 Unicode code point다. 내부 공백은 보존하며 이모지도 한 code point로 센다. ETC에도 상세를 필수로 요구하지 않는다.

성공은 `201 application/json`, `{"id":"123","status":"PENDING"}`다. ID는 문자열이다. 일반 신고 조회 API를 제공하지 않으므로 Location 헤더는 발급하지 않는다. 신고자·처리자와 처리 시각·조치 연결은 서버가 결정하며 새 신고의 처리 필드는 null이다. 신고 등록이 질문을 숨기거나 승인 상태·답안·좋아요를 바꾸지는 않는다.

## 접근과 반복 요청

미삭제 APPROVED 질문 중 본인의 USER 질문이 아닌 질문만 신고할 수 있다. CS·인성, USER·ADMIN 출처를 모두 지원하며 답안 생성 중·실패 여부는 공개 판정과 별개다. 관리자 역할도 같은 조건을 따른다. ADMIN 출처 질문의 검토자 ID가 현재 회원과 같아도 본인 USER 질문으로 취급하지 않는다.

같은 회원은 같은 질문을 한 번만 신고할 수 있다. PENDING·ACCEPTED·DISMISSED 모두 중복 검사 대상이며, 사유를 바꿔도 재신고는 409다. 기존 행과 최초 사유·신고 시각·관리자 처리 정보는 유지한다. 다른 회원은 같은 공개 질문을 각각 신고할 수 있다.

신고 POST는 생성 요청이다. 자동 재시도하면 최초 요청의 성공 여부에 따라 409를 받을 수 있다. 신고 후 본인 상세·목록의 `isReported`는 true이며 상세의 `canReport`는 false다. 관리자 처리 후에도 기존 신고 이력이 있는 동안 이 상태를 유지한다.

## 실패 응답과 검사 순서

본문 형식·상세 길이와 인증을 확인한 뒤 사유 코드를 파싱한다. 유효한 사유의 요청은 질문을 잠그고 공개 여부 → 본인 여부 → 중복 순으로 검사한다. 본인 미승인 질문도 신고 API에서는 404다.

| HTTP·code | 조건 |
| --- | --- |
| `400 INVALID_REQUEST` | 잘못된 경로 ID·JSON 형식·필드 형식·상세 301자 이상 |
| `400 INVALID_REPORT_REASON` | 사유 생략·null·빈 문자열·알 수 없는 코드·대소문자나 공백 불일치 |
| `401 UNAUTHENTICATED` | 검증된 회원 정보 없음·유효하지 않음·탈퇴 |
| `403 ACCESS_DENIED` | 이용 정지 |
| `403 SELF_REPORT_NOT_ALLOWED` | 본인의 공개 USER 질문 |
| `404 QUESTION_NOT_FOUND` | 없음·미승인·숨김·삭제 질문 |
| `409 ALREADY_REPORTED` | 같은 회원의 기존 신고 또는 신고 유일 제약 충돌 |
| `409 QUESTION_STATE_CHANGED` | 비관적 잠금 확보 실패 등 동시 변경 충돌 |

오류는 `{code,message}` 형식이며 길이 검증에는 `fieldErrors`가 추가될 수 있다. 비공개 본문·이전 신고 상세·DB 내부 메시지는 노출하지 않는다. 무결성 예외 중 Hibernate가 제공한 제약명이 `uk_question_reports_question_reporter`인 경우만 중복 신고로 변환한다. H2의 생성 인덱스 접미사도 지원한다. 다른 무결성 오류는 안전한 `500 INTERNAL_ERROR`로 처리하며 중복으로 오인하지 않는다.

## 트랜잭션과 관리자 연계

`QuestionReportController → QuestionReportService → QuestionRepository/QuestionReportRepository`의 3계층을 사용한다. 쓰기 트랜잭션의 첫 Question 조회를 `findForUpdateById`의 `PESSIMISTIC_WRITE`로 수행한다. 공개·소유권·중복 검사 후 저장과 flush를 마치고 커밋까지 잠금을 유지한다.

같은 질문의 동시 신고는 잠금 순서대로 처리한다. 같은 회원의 두 요청은 한 건만 생성되고 나머지는 409다. 서로 다른 회원은 각자 한 건씩 생성할 수 있다. DB의 `(question_id, reporter_id)` 유일 제약도 중복을 막는다. 사전 중복 검사와 별개로 실제 제약 충돌도 위 오류 계약을 따른다.

관리자 승인·숨김·삭제는 [공통 잠금·첫 조회 규칙](update.md#승인과-수정의-잠금-규칙)을 공유해야 한다. 관리자가 먼저 숨김·삭제를 커밋하면 기다린 신고는 404이며 저장되지 않는다. 신고가 먼저 커밋하면 관리자는 이후 숨김·삭제할 수 있고 기존 신고는 남는다. 선조회한 managed Question을 잠금 쿼리가 자동 갱신한다고 가정하지 않는다.

`ReportReasonType`은 문자열로 저장한다. 기존 네 코드 이름은 유지하고 WRONG_QUESTION을 추가했다. 운영 DB에 enum 또는 check 제약이 있다면 허용 값 확대 migration이 필요하다.

신고 상세 컬럼의 저장 용량은 기존 VARCHAR(500)에서 VARCHAR(600)으로 넓혔다. H2는 보조평면 문자 한 개를 UTF-16 두 단위로 계산하므로 300개 이모지는 기존 컬럼에 저장되지 않았다. 입력 제한은 300 code point로 유지하며 저장 공간을 최대 600단위까지 확보한다. 기존 DB에도 `question_reports.reason` 컬럼 확대 migration이 필요하다. 운영 DB와 migration 도구는 담당과 연결할 때 확정한다.

## 검증과 후속 연결

서비스·HTTP 테스트는 5유형·상세 선택 입력과 300/301자·잘못된 사유·신원 위조 차단·본인/비공개/중복 신고를 검증한다. HTTP·H2 통합 테스트에서 신고 행과 서버 초기값, 기존 신고의 상태별 보존, 목록·상세의 개인화 반영을 확인한다. 실제 H2의 유일 제약 예외를 HTTP 오류 처리에 전달해 409와 내부 메시지 비노출도 검증한다.

별도 H2 DB의 독립 트랜잭션으로 같은 회원·다른 회원의 동시 신고, 관리자 숨김·삭제 선점과 신고 선점을 검증한다. 관리자 경로는 같은 Repository 잠금과 실제 엔티티 메서드로 재현한다. 실제 JWT 공급은 [QB-10 공통 인증 연결](contracts.md)을 사용하며, 실제 관리자 API·운영 DB·프론트 신고 폼은 후속 연계 작업에서 연결한다.
