# 질문 상세 조회

WBS `problem-bank-102`, [청사진의 QB-04](README.md#7-브랜치별-todo와-구현-순서)에 해당한다. `GET /api/v1/learning/questions/{questionId}`로 공개 질문 또는 본인의 미승인 USER 질문을 직접 조회한다. 공개 목록에 들어 있지 않은 본인의 대기·반려 질문도 ID로 열 수 있다.

## 접근 권한

[공통 인증 계약](contracts.md)의 검증된 회원 principal이 필요하다. 질문 ID는 양의 Long이며 잘못된 형식·범위는 `400 INVALID_REQUEST`다.

| 질문 상태·소유권 | 조회 | 수정·삭제 가능 여부 |
| --- | --- | --- |
| 미삭제 APPROVED | 인증 회원에게 허용 | false |
| 본인 USER PENDING/REJECTED | 본인에게 허용 | true |
| 타인 PENDING/REJECTED | 404 | 응답 없음 |
| HIDDEN·삭제·존재하지 않음 | 404 | 응답 없음 |

관리자도 일반 상세 API에서 타인의 미승인 질문을 열 수 없다. 관리자 전용 조회는 별도 관리자 API의 책임이다. 미인증·유효하지 않은 principal·탈퇴 계정은 401, 이용 정지는 403이다.

조회 불가와 없는 질문은 모두 `404 {"code":"QUESTION_NOT_FOUND","message":"질문을 찾을 수 없습니다."}`로 반환해 비공개 존재 여부를 구분하지 않는다. 첫 질문 조회 후 공개·소유권을 검사하며, 거절된 요청은 상호작용·키워드·반려 사유·이웃 조회를 실행하지 않는다.

## 응답

성공은 `200 application/json`이다. 다음은 다른 회원이 올린 공개 질문의 예시다. ID는 문자열, 시각은 UTC ISO 8601이다.

```json
{
  "id": "123",
  "major": "CS",
  "category": {"id": "1", "name": "운영체제"},
  "content": "프로세스와 스레드의 차이는 무엇인가요?",
  "source": "USER",
  "status": "APPROVED",
  "createdAt": "2026-11-26T00:00:00Z",
  "reviewedAt": "2026-11-26T01:00:00Z",
  "likeCount": 2,
  "isLiked": false,
  "isMine": false,
  "isReported": false,
  "canEdit": false,
  "canDelete": false,
  "canReport": true,
  "modelAnswer": "프로세스는 실행 중인 프로그램입니다.",
  "modelAnswerStatus": "DONE",
  "keywords": ["프로세스", "스레드"],
  "rejectionReason": null,
  "previous": {"id": "124", "content": "바로 앞의 공개 질문"},
  "next": {"id": "122", "content": "바로 뒤의 공개 질문"}
}
```

- `category`는 중분류 없는 인성 질문이면 null이다.
- `modelAnswer`는 저장된 본문을 그대로 반환하고 없으면 null이다. `keywords`는 없으면 빈 배열이며 `sortOrder,id` 순서를 따른다.
- `modelAnswerStatus`는 AI 생성의 `PENDING/DONE/FAILED` 또는 null이다. 관리자 직접 작성처럼 AI 생성 상태가 없는 경우도 null이므로 승인 상태나 답안 유무와 별도로 해석한다.
- `isMine`은 USER 출처와 인증 회원의 작성자 일치를 함께 확인한다. 관리자 등록자의 검토자 ID를 소유권으로 사용하지 않는다.
- `isLiked/isReported`는 현재 회원의 관계다. 처리된 신고도 `isReported=true`를 유지한다.
- `canReport`는 공개·타인 질문이며 본인의 기존 신고가 없을 때 true다. 본인 질문, 미승인 질문, 이미 신고한 질문은 false다.
- 작성자 ID, 검토자 ID, 전체 신고 내용과 조치 이력은 반환하지 않는다.

## 반려와 앞뒤 이동

`rejectionReason`은 현재 REJECTED인 본인의 질문에만 제공한다. `QuestionModeration`의 REJECT 이력 중 `createdAt DESC,id DESC` 첫 사유를 사용하고 REPORT 이력은 제외한다. 이력이 없으면 null이다. 재제출로 PENDING이 되면 과거 사유를 표시하지 않으며, 이력 자체는 보존한다.

공개 질문의 `previous/next`는 같은 대분류·같은 카테고리의 기본 최신순 목록을 기준으로 한다. `previous`는 더 새로운 후보 중 가장 가까운 질문, `next`는 더 오래된 후보 중 가장 가까운 질문이다. 같은 시각에는 ID 내림차순을 적용한다.

각 방향은 DB에서 한 개만 조회한다. 숨김·삭제·미승인 질문과 다른 분류는 후보에서 제외한다. 현재 카테고리가 null이면 같은 대분류의 null 카테고리 질문끼리만 연결한다. 경계 또는 본인 미승인 상세에서는 해당 이웃이 null이다. 목록의 검색·좋아요 필터나 페이지 조건은 상세 이웃에 전달하지 않는다.

## 구현과 검증

기존 Controller → QueryService → Repository 구조와 엔티티를 재사용한다. 최초 조회는 카테고리만 함께 읽고, 접근 판정 뒤 독립 상관 집계로 좋아요/신고를 계산한다. 키워드와 반려 사유는 별도 정렬 조회로 가져와 좋아요×신고×키워드의 중복 집계를 피한다.

GET은 읽기 전용이며 승인·답안 생성·재생성·이력 변경을 수행하지 않는다. 여러 조회 사이의 동일 스냅샷을 보장하는 계약은 아니며 운영의 더 강한 일관성 요구는 DB 정책과 함께 정한다.

H2 Repository 테스트는 개인정보 집계·키워드/사유 정렬·최근접 이웃을 검증한다. 서비스 테스트는 권한 거절 후 추가 상세 조회가 없는지 확인한다. HTTP·3계층 통합 테스트는 공개 답안, 본인 대기/반려, 재제출 사유 해제와 이력 보존, 동일한 404, nullable 인성·동일 시각·경계 이웃을 확인한다. 실제 JWT와 [프론트 상세 연결](../../frontend/question/archive.md)은 QB-10에서 추가했다.
