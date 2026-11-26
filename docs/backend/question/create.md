# 사용자 CS 질문 등록

WBS `problem-bank-106`, [청사진의 QB-05](README.md#7-브랜치별-todo와-구현-순서)에 해당한다. 로그인 회원이 CS 카테고리와 질문을 제출하면 본인 소유의 승인대기 질문을 생성한다. 입력·인증·오류는 [공통 계약](contracts.md)을 따른다.

## 요청

`POST /api/v1/learning/questions`, `Content-Type: application/json`.

```json
{
  "categoryId": "1",
  "content": "프로세스와 스레드의 차이는 무엇인가요?"
}
```

`categoryId`는 [카테고리 조회](categories.md)에서 받은 실제 CS 카테고리 ID다. ID는 양수여야 하고 DB에 존재해야 한다. 인성 분류를 선택하면 거절한다. `content`는 브라우저 trim 기준으로 양 끝 공백을 제거한 후 10~200 Unicode code point다. 이모지도 같은 기준으로 세며 내부 문구는 변경하지 않는다.

검증된 principal의 현재 회원 ID만 작성자로 사용한다. 정상 USER와 ADMIN 모두 이 사용자 등록 API에서는 같은 USER 출처로 등록한다. 관리자 직접 등록·승인은 별도 관리자 API의 책임이다.

저장에 사용하는 요청 필드는 `categoryId/content`뿐이다. 현재 JSON 설정은 그 밖의 필드를 무시하며, `authorId/source/status/major/reviewedBy/modelAnswer/modelAnswerStatus`를 추가해도 서버 초기값에 반영하지 않는다.

## 성공 응답과 생성 후 동작

```http
HTTP/1.1 201 Created
Location: /api/v1/learning/questions/123
Content-Type: application/json
```

```json
{"id":"123","status":"PENDING"}
```

ID는 DB가 생성한 값의 문자열이며 `Location`에도 같은 ID를 사용한다. Location은 API 상세 경로인 상대 URI다. 프론트에서는 응답 ID로 기존 `/archive/{id}` 상세를 연결한다. 이 화면 연결은 QB-11에서 진행한다.

| 저장 항목 | 초기값 |
| --- | --- |
| 대분류·출처 | `CS`, `USER` |
| 작성자 | 검증된 현재 회원 ID |
| 승인 상태 | `PENDING` |
| 검토자·검토 시각 | null |
| 모범답안·답안 생성 상태 | null |
| 키워드 | 빈 목록 |

등록 즉시 AI 생성이나 승인을 요청하지 않는다. 관리자가 승인한 뒤 답안 생성 상태를 관리한다. 신규 질문은 공개 목록과 카테고리 공개 건수에 포함되지 않지만, 생성 ID로 본인의 [미승인 상세](detail.md)를 열 수 있다. 타인이나 다른 관리자는 일반 상세 API로 조회할 수 없다.

같은 내용의 POST를 반복하면 각각 새로운 질문을 생성한다. 별도 멱등 키·유사도에 따른 등록 차단·목업의 대기 10개 제한은 추가하지 않는다. 등록 폼의 유사 질문 후보 안내는 기존 검색 API를 재사용하는 프론트 연결 작업이다.

## 실패 응답

| HTTP·code | 조건 |
| --- | --- |
| `400 INVALID_REQUEST` | 필수 입력 누락, ID 형식·양수 검증, 공백·길이·JSON 검증 실패 |
| `400 INVALID_CATEGORY` | 카테고리가 없거나 CS가 아님 |
| `401 UNAUTHENTICATED` | 검증된 회원 정보 없음·불완전·탈퇴 |
| `403 ACCESS_DENIED` | 이용 정지 회원 |

인증 실패 시 카테고리 조회와 저장을 실행하지 않는다. 입력이나 분류 검증 실패도 질문을 저장하지 않는다. 실제 Bearer 토큰 검증기는 공통 인증 담당과 연결하며, 회원 ID 헤더를 인증으로 사용하지 않는다.

## 구현과 검증

변경 요청은 `QuestionCommandController → QuestionCommandService → Repository`로 처리한다. 기존 GET Controller와 QueryService는 조회를 담당한다. 서비스의 쓰기 트랜잭션 안에서 분류를 확인하고 기존 `Question.createByUser`와 `QuestionRepository.save`로 저장한다. 새 엔티티·테이블·프론트 변경은 없다.

서비스 테스트는 실제 저장 인자의 서버 고정값과 미생성 상태, 잘못된 분류의 저장 거절을 확인한다. HTTP 테스트는 입력 경계·인증·201/Location을 검증한다. 실제 H2 통합 테스트는 생성 후 DB 재조회, 본인 상세·타인 차단, 공개 집계 불변, JSON 추가값 위조 방지와 반복 POST 동작을 확인한다.
