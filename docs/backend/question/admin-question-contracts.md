# 관리자 문제은행 공통 계약

[admin-question 청사진](admin-question.md)의 AQB-01에서 사용하는 인터페이스다. WBS의 관리자 문제은행 7개 경로를 기준으로 요청·응답·오류·입력·버전 정책을 정한다. 화면은 [관리자 문제은행 연결](../../frontend/question/admin-question.md)을 따른다. 관리자 조회·저장·AI 작업의 적용 순서는 AQB-02~AQB-12에 둔다.

## 인증과 응답

모든 `/api/v1/admin` 및 하위 경로·메서드는 JWT 검증 뒤 현재 DB의 양수 회원 ID·ADMIN·ACTIVE·미탈퇴를 요구한다. role 클레임이나 scope로 DB 권한을 대체하지 않는다. 같은 토큰을 재사용해도 DB의 승격·강등·정지·탈퇴가 다음 요청에 적용된다.

필터와 모듈 진입점은 같은 판정 규칙을 사용한다. Controller는 `AdminQuestionAuthentication.requireAdmin(principal)`으로 얻은 `AdminQuestionActor`를 전달하며 body/query/header의 adminId로 만들지 않는다. 인가 실패 시 업무 로직과 입력 검증을 실행하지 않는다.

| 조건 | HTTP·코드 |
| --- | --- |
| 토큰 없음·위조·만료·잘못된 issuer/subject·없는/탈퇴 회원 | 401 BACKEND-SECURITY-101 |
| 인증된 USER·정지 계정 | 403 BACKEND-SECURITY-102 |
| 현재 DB의 정상 ADMIN | 진입 허용. 이후 입력·존재·상태·버전 검증 적용 |

관리자 API는 [공통 ApiResponse](../../api-response.md) envelope를 사용한다. 기존 사용자 문제은행·카테고리의 성공/업무 오류는 flat 계약을 유지한다. `QuestionPlainApi` 표시가 있는 기존 Controller만 flat 예외 처리를 적용하며 관리자 예외 처리는 `question.admin`에 한정한다.

성공 예:

```json
{"success":true,"data":{"id":"42","revision":"0","status":"APPROVED","modelAnswerStatus":null},"error":null}
```

업무 오류 예:

```json
{"success":false,"data":null,"error":{"type":"/api/v1/admin/questions/42","errorCode":"BACKEND-BUSINESS-205","httpTitle":"CONFLICT","httpStatus":409,"detail":"질문 내용이 변경되었습니다. 최신 내용을 확인해 주세요.","validationErrors":null,"timestamp":"2026-11-28T12:00:00+09:00"}}
```

ID·revision은 JSON에서 10진 문자열이다. 요청도 양수 ID 문자열, 0 이상의 expectedRevision 문자열을 사용한다. page/pageSize와 집계는 JSON 정수다. 질문·신고·검토의 업무 시각은 ISO 8601 UTC, 공통 오류 timestamp는 기존 KST(+09:00)다. 서버 시간·검토자·작성자·상태를 요청 값으로 덮어쓰지 않는다.

## 입력 규칙

`AdminQuestionInput`은 후속 요청 DTO·유스케이스에서 재사용할 정규화/검증이다. 브라우저와 같은 공백 집합으로 양 끝만 trim하고 길이는 Unicode code point로 센다.

| 필드 | 계약 |
| --- | --- |
| content | 필수, trim 후 10~200자. 관리자 목업의 최소 5자를 사용자와 같은 10자로 통일 |
| modelAnswer | 수동 등록/수정 시 1~2,000자. Markdown 원문과 내부 개행·코드 보존 |
| hint | 선택, null/빈 값은 비움, 최대 2,000자 |
| keywords | null 금지, 빈 배열 허용. trim·빈 항목 제거·중복 제거 후 입력 순서 유지, 최대 10개·각 1~20자. null 항목은 거절 |
| major/categoryId | CS는 존재하는 CS 카테고리 필수. PERSONALITY는 같은 대분류 카테고리 또는 null. major는 등록 후 불변 |
| reason | 반려·모든 신고 조치에 필수, trim 후 1~300자 |
| keyword | 검색어 trim 후 최대 100자. 생략/빈 값은 검색 없음 |
| reportIds | 요청 배열 1~100개, 모두 양수. URL reportId 포함. 중복 제거·ID 오름차순 정규화 후 같은 질문/미처리 여부는 잠금 안에서 검사 |
| expectedRevision | UPDATE·심사에 필수인 0 이상의 버전. 잠금 후 현재 값과 다르면 409 |

PATCH의 필드 생략은 유지, hint와 PERSONALITY categoryId의 명시적 null은 비우기다. CS categoryId/content/modelAnswer/keywords의 명시적 null은 400이다. presence 정보가 필요한 PATCH DTO는 생략과 null을 구분해야 하며 Java record의 nullable 값만으로 둘을 같은 의미로 취급하지 않는다.

지원하지 않는 action·decision, 잘못된 enum·숫자·미지 필드, 서버 관리 필드(source/authorId/status/adminId/reviewedBy/createdAt/deletedAt/modelAnswerStatus/revision)를 변경하려는 본문은 400이다. DTO의 알 수 없는 필드 거절은 관리자 요청에 한정하고 기존 인증/사용자 parser 설정을 바꾸지 않는다.

## 7개 API의 요청·응답

아래 경로는 모두 `/api/v1/admin` 기준이다. GET/PATCH/DELETE 성공은 200 envelope, 등록은 201 envelope와 Location 헤더를 반환한다. 빈 204와 envelope 성공을 섞지 않는다.

### admin-101 · GET /questions

- 조건: major, categoryId, source, status(반복 가능), keyword, sort, page, pageSize. 기본 status=APPROVED/HIDDEN, sort=UPDATED, page=1, pageSize=10, 크기 상한 100.
- 승인대기 화면은 `major=CS&source=USER&status=PENDING`을 명시한다. 다른 조건도 AND로 적용하며 결과가 없는 조합은 빈 페이지다. 삭제 질문은 제외한다.
- LATEST는 createdAt DESC/id DESC, UPDATED는 updatedAt DESC/id DESC, LIKES는 likeCount DESC/updatedAt DESC/id DESC다.
- 검색은 사용자 문제은행과 같은 대소문자·공백 정규화 및 LIKE 특수문자 escape를 적용한다. 표시 코드는 ADMIN=`Q-{ID 최소 4자리}`, USER=`U-{ID 최소 4자리}`로 결정하며 완전한 코드 일치 검색을 추가한다. 코드 접두어 부분 검색은 지원하지 않는다.
- questionId를 단독 조건으로 주면 미삭제 질문 한 건을 같은 items 구조로 조회한다. major/categoryId/source/status/keyword/sort와 함께 보내면 400이며 page/pageSize는 생략한다. 질문이 없으면 ADMIN_QUESTION_NOT_FOUND다.
- `data={items,totalCount,page,pageSize,totalPages,counts}`. 빈 결과는 page=1/totalPages=1, 초과 페이지는 마지막 페이지로 보정한다.
- counts는 필터 전 미삭제 데이터의 bank(APPROVED/HIDDEN), pending(USER/CS/PENDING), rejected(USER/REJECTED), bankByMajor(CS/PERSONALITY), bankByCategory다. totalCount는 요청 필터 적용 건수다. 공통 카테고리 API의 공개 건수와 관리자 은행 건수를 혼용하지 않는다.

QuestionItem은 다음 필드를 갖는다. WBS에 따라 페이지 항목에 편집 데이터도 포함하며 새 상세 경로를 만들지 않는다.

```text
id, code, revision, inputRevision, major, category:{id,name}|null,
content, modelAnswer|null, hint|null, keywords:순서 있는 문자열 배열,
source, author:{id,nickname,email}|null, status, modelAnswerStatus|null,
likeCount, reviewedAt|null, createdAt, updatedAt,
capabilities:{canUpdate,canDelete,canReview,canRestore,canRegenerate}
```

ADMIN 출처는 author=null이다. 탈퇴 작성자는 원래 author ID와 `nickname="탈퇴한 회원",email=null`로 표시한다. PENDING USER CS만 canReview, APPROVED/HIDDEN만 canUpdate/canRegenerate, HIDDEN만 canRestore다. 답안 PENDING이면 canRegenerate=false다. author의 이메일과 검토 데이터는 관리자 전용 응답이며 사용자 목록에 추가하지 않는다.

### admin-102 · POST /questions

요청: `{major,categoryId,content,modelAnswer,hint?,keywords}`.

정규화된 질문·수동 답안·힌트·키워드를 한 트랜잭션으로 저장한다. source=ADMIN, status=APPROVED, authorId=null, modelAnswerStatus=null, reviewedBy=검증된 관리자다. revision/inputRevision 초기 값은 0이다. 응답 data는 `{id,revision,status,modelAnswerStatus}`다.

POST 생성은 자동 재시도하지 않는다. 카테고리 없음/대분류 불일치는 400 ADMIN_INVALID_CATEGORY, 본문 오류는 400 INVALID_INPUT이다.

### admin-103 · PATCH /questions/{questionId}

세 action을 한 요청에서 섞지 않는다.

| action | 요청 | 결과 data |
| --- | --- | --- |
| UPDATE | action, expectedRevision, 수정할 categoryId/content/modelAnswer/hint/keywords 중 하나 이상 | id, revision, inputRevision, status, modelAnswerStatus |
| RESTORE | action만 | id, revision, status=APPROVED |
| REGENERATE_ANSWER | action만 | id, revision, generationId, modelAnswerStatus=PENDING |

UPDATE는 미삭제 APPROVED/HIDDEN만 가능하다. major·source·작성자·기존 검토 이력은 유지한다. 수동 답안 선택은 기존 AI 요청을 무효화하고 ADMIN 답안 상태는 null, USER는 DONE으로 맞춘다.

RESTORE는 HIDDEN만 가능하며 신고를 종료하지 않는다. REGENERATE_ANSWER는 APPROVED/HIDDEN 중 답안이 PENDING이 아닐 때만 가능하다. 생성 작업 전달·재시도·결과 저장은 AQB-08의 계약을 충족해야 하며 AI 연결이 준비되지 않았으면 가짜 PENDING 성공을 반환하지 않는다.

없는/삭제 질문은 404 ADMIN_QUESTION_NOT_FOUND, 상태/작업 충돌은 409 ADMIN_QUESTION_STATE_CHANGED, 오래된 UPDATE는 409 ADMIN_REVISION_CONFLICT, 지원하지 않는 action/혼합 payload는 400 ADMIN_INVALID_ACTION이다.

### admin-104 · DELETE /questions/{questionId}

본문 없이 단건 soft delete한다. 응답 data는 `{id,deleted:true}`다. 과거 면접·좋아요·신고·조치 기록은 보존한다. 이미 삭제되었거나 없는 질문은 404다. 화면의 선택 삭제는 여러 단건 요청이며 부분 실패를 그대로 표시한다. batch endpoint나 전체 원자성을 전제하지 않는다.

### admin-107 · PATCH /questions/{questionId}/review

요청: `{decision:APPROVE|REJECT,expectedRevision,reason?}`. APPROVE에 reason을 섞으면 400, REJECT에는 reason이 필수다.

잠금 후 USER/CS/PENDING과 조회 버전을 검사한다. APPROVE는 검토자·시각과 APPROVED/답안 PENDING 및 내구성 있는 생성 요청을 원자적으로 저장하고 `{id,revision,status,modelAnswerStatus,generationId}`를 반환한다. REJECT는 REJECTED·REJECT 조치 사유를 저장하고 `{id,revision,status,moderationId}`를 반환한다.

재처리/타 관리자 처리/승인 뒤 요청은 409 ADMIN_QUESTION_STATE_CHANGED, 사용자가 본문을 바꾼 뒤 옛 화면으로 심사하면 409 ADMIN_REVISION_CONFLICT다. 반려 기록을 삭제하지 않으며 사용자 수정은 같은 ID의 PENDING 재제출이다.

### admin-108 · GET /question-reports

목록 조건: status(신고 처리상태, 기본 PENDING), questionStatus(선택), keyword(선택), page=1/pageSize=10(상한100). status=ALL은 모든 신고 이력을 포함한다. 미처리 목록은 해당 상태 신고가 있는 질문 그룹만 반환한다. 정렬은 그룹의 최신 신고일 DESC/questionId DESC다.

`data={items,totalCount,page,pageSize,totalPages,counts,detail}`.

- items는 질문별 `{questionId,code,content,questionStatus,deletedAt,pendingCount,reportCount,latestReportedAt,reasonCounts}`다. reasonCounts는 5유형 전체를 키로 하고 0건도 포함한다.
- totalCount는 조건에 맞는 **질문 그룹 수**다. counts는 필터 전 pendingQuestionCount/pendingReportCount/totalReportCount다. reportCount/reasonCounts는 그 질문의 전체 이력, pendingCount는 PENDING 행만 센다.
- 기본 detail=null이다. questionId 조건은 같은 GET의 상세 조회이며 목록 필터/page/pageSize와 함께 보내지 않는다. 이때 items는 해당 질문 그룹 1개이고 detail에 `{questionId,entries,totalCount,page,pageSize,totalPages}`를 추가한다.
- 상세의 entryStatus(기본 ALL), entryPage(기본1), entryPageSize(기본20/상한100)는 개별 신고 페이지다. 목록 모드에서 entry 조건은 400이다. entries는 `{id,reasonType,detail,status,createdAt,handledBy,handledAt,moderation}`이며 createdAt DESC/id DESC다. moderation은 id/type/reason/moderatorId/createdAt 또는 null이다.
- 삭제된 질문도 그룹과 조치 이력을 조회한다. questionId에 신고가 없으면 404 ADMIN_REPORT_NOT_FOUND다. 신고자 이메일/토큰/원문 내부 예외는 포함하지 않는다.

### admin-109 · PATCH /question-reports/{reportId}

요청: `{action:HIDE|DELETE|DISMISS,reportIds,reason}`. reason은 세 action 모두 필수다.

URL reportId와 선택 ID가 같은 질문의 PENDING 신고인지 검사한다. 질문 행을 먼저 잠그고 개별 신고 ID 오름차순으로 처리한다. 잘못된 선택은 전체 롤백하며 조회 후 추가된 미선택 신고는 처리하지 않는다.

HIDE는 APPROVED→HIDDEN, DELETE는 soft delete이며 선택 신고를 ACCEPTED로 바꾼다. DISMISS는 선택 신고를 DISMISSED로 바꾸고 공개 상태는 유지한다. 세 작업 모두 선택 집합을 REPORT 조치 1건·사유·처리자·시각에 연결한다. 삭제된 질문의 잔여 신고는 DISMISS만 가능하다.

응답 data는 `{questionId,action,moderationId,handledReportIds,remainingPendingCount,questionStatus,deletedAt}`다.

- 없는 URL/선택 신고: 404 ADMIN_REPORT_NOT_FOUND.
- 다른 질문의 신고/기준 ID 누락/배열 상한 등: 400 ADMIN_INVALID_REPORT_SELECTION.
- 처리 완료 신고: 409 ADMIN_REPORT_ALREADY_HANDLED.
- 숨길 수 없는 상태·이미 삭제된 질문의 DELETE/HIDE: 409 ADMIN_QUESTION_STATE_CHANGED.
- 같은 처리 재시도는 409이며 조치 이력을 중복 생성하지 않는다. 종료 후에도 원 신고 행을 남겨 동일 회원 재신고 금지를 보존한다.

## 오류 코드 대역

기존 BUSINESS 1xx·INFRA 1xx와 겹치지 않는 대역을 사용한다. 입력 검증은 기존 GLOBAL-101, 인증·인가는 기존 SECURITY-101/102, 알 수 없는 DB/서버 오류는 GLOBAL-102다.

| ErrorCode | 외부 코드 | HTTP |
| --- | --- | --- |
| ADMIN_QUESTION_NOT_FOUND | BACKEND-BUSINESS-201 | 404 |
| ADMIN_REPORT_NOT_FOUND | BACKEND-BUSINESS-202 | 404 |
| ADMIN_QUESTION_STATE_CHANGED | BACKEND-BUSINESS-203 | 409 |
| ADMIN_REPORT_ALREADY_HANDLED | BACKEND-BUSINESS-204 | 409 |
| ADMIN_REVISION_CONFLICT | BACKEND-BUSINESS-205 | 409 |
| ADMIN_INVALID_CATEGORY | BACKEND-BUSINESS-206 | 400 |
| ADMIN_INVALID_REPORT_SELECTION | BACKEND-BUSINESS-207 | 400 |
| ADMIN_INVALID_ACTION | BACKEND-BUSINESS-208 | 400 |
| QUESTION_AI_NOT_CONFIGURED | BACKEND-INFRA-201 | 503 |
| QUESTION_AI_UNAVAILABLE | BACKEND-INFRA-202 | 502 |

입력 오류의 validationErrors에는 안전한 필드별 메시지만 담는다. 숫자·enum 바인딩 실패의 거절된 값과 JSON 파싱 내부 문구는 노출하지 않는다. 반환값 검증 오류는 요청의 400으로 바꾸지 않고 500이다. 비관 잠금 경합은 ADMIN_QUESTION_STATE_CHANGED, 낙관 잠금 충돌은 ADMIN_REVISION_CONFLICT로 변환한다. 다른 무결성 오류를 일괄 중복 신고 오류로 분류하지 않는다.

## 버전·DB·외부 연결 기준

- `revision BIGINT NOT NULL DEFAULT 0`: 관리자 편집·심사에 쓰는 단조 증가 버전. 내용·분류·답안·힌트·키워드·심사/공개/삭제 상태 변경과 AI 결과 저장 때 증가한다. 사용자 수정/재제출도 같은 규칙을 적용한다. 좋아요 수·신고 행만 바뀌는 경우에는 증가시키지 않는다.
- `input_revision BIGINT NOT NULL DEFAULT 0`: AI 결과의 유효성을 판정한다. 내용/분류/힌트 변경, 수동 답안·키워드 선택, 새 생성 요청, 삭제로 증가한다. 숨김·재공개만으로는 증가하지 않는다. 작업은 generationId와 inputRevision을 함께 저장하고 결과 저장 전에 비교한다.
- 기존 행은 0으로 backfill한 뒤 NOT NULL을 적용한다. 컬럼과 공유 writer 갱신은 AQB-03/04 및 관련 사용자 변경 경로에서 함께 도입하고, 이를 적용하기 전 expectedRevision 보호를 제공한다고 보고하지 않는다. 실제 작업 저장 구조는 AQB-08에서 확정한다.
- `question_moderations.reason`은 300 code point 저장을 위해 600단위로 확대해야 한다. 기존 신고 reason 600/WRONG_QUESTION migration과 함께 운영 DB 담당의 migration 절차에서 검증한다. AQB-01에서 운영 DDL을 실행하거나 도구를 임의 선택하지 않는다.
- 카테고리 ID/표시 순서/seed는 [기존 계약](categories.md)을 재사용한다. AI 담당은 generationId/inputRevision·입력 snapshot·답안 Markdown·순서 있는 키워드·분류된 실패를 주고받으며 인증/URL/timeout/재시도 상한과 작업 전달 보장을 AQB-08 착수 조건으로 확정한다.
- Markdown 원문 저장·입력 길이는 이 계약을 따르고 렌더링과 안전한 표시의 책임은 [#35](https://github.com/likelion-backendschool-9th/answerfit/issues/35)의 공통 화면 구현과 연결한다. DB/AI 담당자의 실제 환경과 인수 확인은 해당 연계 작업에서 기록한다.

## 검증 범위

관리자 인가 테스트는 실제 서명 JWT·DB 회원·Security 필터를 사용하고 7개 메서드의 테스트 전용 Controller로 인가 경계를 확인한다. 입력 검증·오류·기존 flat 응답 호환을 별도로 검사한다. 이 결과만으로 관리자 질문 조회·저장이나 실제 AI 제공자·운영 DB·브라우저 전체 흐름이 구현되었다고 간주하지 않는다.

