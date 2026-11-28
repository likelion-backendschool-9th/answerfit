# 카테고리 조회

WBS `problem-bank-105`, [청사진의 QB-02](README.md#7-기능별-구현-순서)에 해당한다. 질문 목록·사용자 등록·관리자·면접 설정이 같은 카테고리 ID와 표시 순서를 재사용한다. 인증과 오류는 [공통 계약](contracts.md)을 따른다.

## 요청과 응답

`GET /api/v1/categories`. 본문과 필수 쿼리는 없다. 기존 질문 화면에 맞춰 회원 전용으로 제공하며, 정상 USER와 ADMIN은 동일한 공개 질문 집계를 받는다.

성공은 `200 application/json`이다. CS, PERSONALITY 순서로 대분류를 반환하고, 각 카테고리는 `sortOrder`, `id` 오름차순이다. 질문이 없는 카테고리도 0건으로 반환한다.

초기 분류만 있고 질문은 없는 경우의 응답 예시다. ID는 DB가 생성한 값이므로 예시 숫자를 코드에 고정하지 않고 이 응답에서 읽는다.

```json
{
  "majors": [
    {
      "major": "CS",
      "name": "CS",
      "questionCount": 0,
      "categories": [
        {"id": "1", "name": "운영체제", "sortOrder": 10, "questionCount": 0},
        {"id": "2", "name": "네트워크", "sortOrder": 20, "questionCount": 0},
        {"id": "3", "name": "데이터베이스", "sortOrder": 30, "questionCount": 0},
        {"id": "4", "name": "자료구조", "sortOrder": 40, "questionCount": 0},
        {"id": "5", "name": "알고리즘", "sortOrder": 50, "questionCount": 0},
        {"id": "6", "name": "웹", "sortOrder": 60, "questionCount": 0}
      ]
    },
    {
      "major": "PERSONALITY",
      "name": "인성 면접",
      "questionCount": 0,
      "categories": [
        {"id": "7", "name": "협업", "sortOrder": 10, "questionCount": 0},
        {"id": "8", "name": "성장", "sortOrder": 20, "questionCount": 0},
        {"id": "9", "name": "지원 동기", "sortOrder": 30, "questionCount": 0},
        {"id": "10", "name": "문제 해결", "sortOrder": 40, "questionCount": 0}
      ]
    }
  ]
}
```

ID는 문자열, `sortOrder`와 `questionCount`는 숫자다. 초기화가 꺼져 있고 DB에 분류가 하나도 없다면 두 대분류와 빈 `categories`를 반환한다.

인증 정보가 없거나 유효하지 않으면 `401 {code:"UNAUTHENTICATED",message:...}`, 이용 정지는 `403 {code:"ACCESS_DENIED",message:...}`다. 인증 거절은 데이터 조회 전에 처리한다. 아직 공통 인증 adapter가 없으므로 Bearer 헤더만으로 principal을 만들지 않는다.

## 집계 기준

- 공개 질문은 `status=APPROVED AND deleted_at IS NULL`이다. 대기·반려·숨김·삭제 질문은 제외한다.
- 승인 직후 답안 생성 대기나 생성 실패 상태인 질문도 포함한다. 답안 상태와 공개 여부를 분리한 기존 정책을 유지한다.
- 모든 건수는 검색·좋아요·페이지 필터와 무관한 공개 전체 건수다.
- 인성 질문은 중분류 없이 등록할 수 있으므로 대분류 건수를 카테고리 건수의 합으로 계산하지 않는다. 중분류 없는 질문도 PERSONALITY 전체 건수에는 포함한다.

기존 `Category`와 `Question` 엔티티를 재사용한다. Controller는 인증·HTTP 응답, Service는 대분류 묶음과 초기 데이터 규칙, Repository는 DB 집계를 담당한다. 카테고리별 LEFT JOIN 집계와 대분류별 독립 집계의 두 쿼리를 사용해 질문 전체를 메모리에 적재하지 않는다. 공개 조건을 JOIN에 적용해 비공개 질문만 있는 분류도 0건으로 유지한다.

조회는 읽기 전용 트랜잭션이다. 두 집계 사이에 승인·숨김이 발생할 때까지 동일 스냅샷을 보장하는 계약은 아니며, 운영에서 더 강한 일관성이 필요하면 DB 격리 정책을 함께 정한다.

## 초기 분류 정책

기존 프론트의 `CS_CATEGORIES`와 관리자 `PERSONALITY_CATEGORIES`를 기준으로 CS 6개와 인성 4개를 등록한다. 신규 분류의 순서는 대분류별 10부터 10 간격이다.

애플리케이션 시작 시 `(major, name)`이 없는 기본 분류만 추가한다. 이미 있는 분류의 ID·이름·순서와 추가 분류는 보존한다. 초기화를 반복해도 같은 이름의 분류가 중복 생성되지 않으며 ID를 재발급하지 않는다.

`answerfit.question.seed-enabled`는 기본 `true`다. 운영 DB를 migration으로 관리할 때는 같은 초기 분류를 migration에서 등록하고 아래 설정으로 시작 시 초기화를 끈다.

```properties
answerfit.question.seed-enabled=false
```

이름 기준 보충이므로 기본 분류의 이름을 바꾸고 초기화를 다시 실행하면 원래 이름의 분류가 추가된다. 이름 변경을 운영 정책으로 허용하기 전에 seed를 끄고 migration에서 관리한다. 이 초기화는 단일 프로세스 실행을 기준으로 하며, 다중 인스턴스의 동시 초기화는 운영 migration에서 처리한다.

운영 DB 종류나 DDL/migration 도구는 이 작업에서 변경하지 않는다. 테스트의 H2 성공은 운영 DB의 FK·인덱스 검증을 대신하지 않는다.

## 검증

Repository 테스트는 실제 H2에서 공개 조건·0건 분류·동점 정렬·중분류 없는 인성 집계를 확인한다. Controller 테스트는 회원/관리자 응답과 미인증·정지·탈퇴 거절, 문자열 ID 및 오류 형식을 확인한다.

통합 테스트는 실제 Controller → Service → Repository와 H2를 연결해 기본 분류 등록, 공개 건수, 초기화 반복·누락 보충·기존 ID/순서 보존을 확인한다. 테스트 principal은 인증 경계의 소비를 검증하며 실제 토큰 발급·검증을 대신하지 않는다. QB-10은 별도 실제 JWT 테스트와 [프론트 조회 연결](../../frontend/question/archive.md)을 추가했다.
