# 질문 목록 조회

WBS `problem-bank-101`, [청사진의 QB-03](README.md#7-기능별-구현-순서)에 해당한다. 공개된 질문을 서버에서 검색·정렬·페이지 조회하고, 인증 회원의 좋아요·소유권·신고 여부를 함께 반환한다. 기존 `question/entity`를 재사용하며 Controller → Service → Repository 구조를 따른다.

## 요청

`GET /api/v1/learning/questions`. [공통 인증 계약](contracts.md)의 검증된 회원 principal이 필요하다. 회원 ID는 쿼리로 받지 않는다. USER와 ADMIN 모두 동일한 공개 목록을 조회한다.

| 쿼리 | 기본값 | 적용 기준 |
| --- | --- | --- |
| `major` | `CS` | `CS`, `PERSONALITY` |
| `categoryId` | 없음 | 양의 ID, 실제 존재하고 선택 대분류와 일치해야 함 |
| `keyword` | 빈 문자열 | 양 끝 공백 제거 후 최대 100 Unicode code point |
| `likedOnly` | `false` | `true`이면 현재 회원이 좋아요한 질문만 |
| `sort` | `LATEST` | `LATEST`, `LIKES` |
| `page` | `1` | 1 이상의 정수 |
| `pageSize` | `7` | 1~100의 정수, 요청한 유효한 크기 그대로 사용 |

`LATEST`는 `createdAt DESC, id DESC`, `LIKES`는 `likeCount DESC, createdAt DESC, id DESC`다. 동점은 ID로 구분해 순서를 안정적으로 유지한다.

검색은 질문 본문에 대한 부분 일치다. 기존 프론트와 같이 소문자로 바꾸고 공백을 제거한 후 비교한다. NBSP·BOM·탭·줄바꿈을 포함해 브라우저가 공백으로 취급하는 25개 문자를 내용과 검색어 양쪽에서 제거한다. 검색 결과에도 원문은 그대로 반환한다.

`%`, `_`, `!`는 검색 문자의 일부다. LIKE 문법으로 해석하지 않도록 `!`로 이스케이프하고 검색값을 파라미터로 바인딩한다. 예를 들어 `%_!`는 세 문자가 연속으로 있는 질문을 찾는다.

## 응답

성공은 `200 application/json`이다. 다음은 좋아요 필터의 결과가 한 개이고, 전체 공개 질문은 CS 6개·인성 2개인 응답 예시다.

```json
{
  "items": [
    {
      "id": "123",
      "major": "CS",
      "category": {"id": "1", "name": "운영체제"},
      "content": "프로세스와 스레드의 차이는 무엇인가요?",
      "status": "APPROVED",
      "likeCount": 2,
      "isLiked": true,
      "isMine": false,
      "isReported": false
    }
  ],
  "totalCount": 1,
  "page": 1,
  "pageSize": 7,
  "totalPages": 1,
  "majorCounts": {"CS": 6, "PERSONALITY": 2}
}
```

- 질문·카테고리 ID는 문자열이다. 카테고리 없는 인성 질문은 `category=null`이다.
- `totalCount`는 검색·분류·좋아요 조건을 모두 적용한 건수다.
- `majorCounts`는 필터·페이지·조회 회원과 무관한 공개 전체 건수다. 질문이 없는 대분류도 0을 반환한다.
- `likeCount`는 해당 질문의 전체 좋아요 수이며, `isLiked`는 현재 회원의 선택 여부다.
- `isMine`은 `source=USER`이면서 작성자가 현재 회원일 때만 true다. 관리자 등록 질문의 검토자 ID를 소유권으로 사용하지 않는다.
- `isReported`는 현재 회원이 남긴 신고가 있을 때 true다. 종료된 신고도 기존 유일 제약과 재신고 정책에 맞춰 포함한다. 다른 회원의 신고 내용이나 여부는 노출하지 않는다.
- 답안·키워드·작성자 ID는 목록 응답에 포함하지 않는다. 상세는 QB-04에서 연결한다.

공개 조건은 `APPROVED AND deleted_at IS NULL`이다. 본인의 미승인 질문도 목록에서는 제외하며, 생성 중·생성 실패 답안이 있는 승인 질문은 포함한다. 내가 올린 질문 조회는 별도 회원 API를 사용한다.

## 페이지와 오류

마지막 페이지를 넘는 요청은 마지막 유효 페이지로 보정하고 실제 `page`를 응답한다. `pageSize`는 그대로다. 건수가 0이면 `items=[]`, `totalCount=0`, `page=1`, `totalPages=1`이다. 이 경우에도 `majorCounts`는 공개 전체 건수다.

페이지 보정을 먼저 수행한 뒤 long으로 offset을 계산한다. 보정된 offset 자체가 JPA의 정수 offset 상한을 넘는 경우는 `400 INVALID_REQUEST`다. 단순히 큰 페이지를 요청했으나 실제 마지막 페이지가 작은 경우는 정상 보정된다.

| HTTP·code | 조건 |
| --- | --- |
| `400 INVALID_REQUEST` | 형식·enum·검색어 길이·페이지·페이지 크기 등 입력 검증 실패 |
| `400 INVALID_CATEGORY` | 분류가 없거나 선택 대분류와 다름 |
| `401 UNAUTHENTICATED` | principal이 없거나 인증 계약을 만족하지 못함 |
| `403 ACCESS_DENIED` | 이용 정지 회원 |

오류 본문은 [공통 계약](contracts.md)의 `code/message`와 필요한 `fieldErrors`를 사용한다. 실제 토큰 검증기는 공통 인증 담당과 연결해야 하며, Bearer 헤더나 임의 회원 ID 헤더만으로 조회 권한을 부여하지 않는다.

## DB 조회와 검증

조건별 count와 페이지 projection을 분리한다. 좋아요 수와 회원별 좋아요·신고 여부는 페이지 SQL의 상관 서브쿼리로 제공해 좋아요×신고 JOIN에 따른 중복을 피하고, 질문마다 별도 SQL을 실행하지 않는다. 카테고리는 LEFT JOIN으로 중분류 없는 인성 질문을 보존한다.

대분류 전체 건수는 카테고리 조회와 같은 공개 집계를 재사용한다. 분류가 지정되면 먼저 존재 여부와 대분류 일치를 확인한다. 빈 결과는 페이지 본문 SQL을 생략한다.

현재 Hibernate와 H2에서 검색·SELECT/정렬의 상관 서브쿼리를 검증했다. 운영 DB 변경 시 문자열 함수·소문자 비교와 쿼리 동작을 다시 확인한다. 새 검색 컬럼이나 DB 도구는 추가하지 않는다. 읽기 전용 트랜잭션은 여러 집계 사이의 동일 스냅샷을 보장하는 계약이 아니며, 조회 중 좋아요·승인·숨김이 바뀌면 페이지 결과가 달라질 수 있다.

Repository 테스트는 공개 조건·한국어/영문/공백/특수문자 검색·개인화·정렬 동점·페이지를 실제 H2에서 검증한다. Controller 테스트는 바인딩·인증·검증 오류와 JSON 필드 이름을 확인한다. 실제 3계층 통합 테스트는 필터 조합·전체 건수·카테고리 검증과 큰 페이지 보정을 확인하고, 페이지 크기가 커져도 SQL 횟수가 질문 수에 비례해 증가하지 않는지 검증한다. 프론트 연결은 QB-10에서 진행한다.
