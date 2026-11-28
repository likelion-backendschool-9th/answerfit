# API 응답 형식

모든 백엔드 API가 따르는 응답 형식과 에러 코드 규칙이다. 프론트는 이 형식을 기준으로 응답을 읽는다.

## 형식
성공과 실패 모두 `ApiResponse`로 감싼다. (#13, 2026-11-26)

```json
{ "success": true, "data": { "id": 1 }, "error": null }
```

```json
{
  "success": false,
  "data": null,
  "error": {
    "type": "/api/users/1",
    "errorCode": "BACKEND-BUSINESS-103",
    "httpTitle": "NOT_FOUND",
    "httpStatus": 404,
    "detail": "존재하지 않는 회원입니다.",
    "validationErrors": null,
    "timestamp": "2026-11-26T11:50:27.682739+09:00"
  }
}
```

- `type`은 요청 경로다. 서버 호스트가 드러나지 않게 전체 URL은 넣지 않는다.
- `validationErrors`는 `@Valid` 검증 실패일 때만 `{ 필드: 메시지 }`로 채운다.
- `timestamp`는 KST 시간대(`+09:00`)를 붙여 보낸다.
- HTTP 상태 코드와 `error.httpStatus`는 항상 같다.

## 에러 코드
형식은 `BACKEND-<도메인>-<순번>`이다. 순번의 백의 자리가 대역이다. 새 코드는 맞는 대역의 다음 번호로 `ErrorCode`에 추가한다. (#13, 2026-11-26)

| 도메인 | 대역 | 내용 |
| --- | --- | --- |
| `GLOBAL` | 1xx | 모든 API 공통 (잘못된 입력, 서버 오류, 404·405·415) |
| `SECURITY` | 1xx | 인증·인가 일반 |
| `SECURITY` | 2xx | 리프레시 토큰 |
| `BUSINESS` | 1xx | 회원가입·로그인·계정 |
| `INFRA` | 1xx | 카카오 연동 (#12) |

## 예외를 던지는 법
- 서비스는 `throw new CustomException(ErrorCode.XXX)`만 던진다. `ResponseStatusException`은 쓰지 않는다. 던지더라도 상태별로 아래처럼 바뀌므로 원래 상태(예: 409)가 사라진다.
- 스프링 MVC가 내는 예외는 `GlobalExceptionHandler.handleExceptionInternal` 한 곳에서 상태로 코드를 고른다: 404 `API_NOT_FOUND`, 405 `METHOD_NOT_ALLOWED`, 415 `UNSUPPORTED_MEDIA_TYPE`, 그 밖의 4xx `INVALID_INPUT`(400), 5xx `SERVER_ERROR`(500).
- 처리하지 못한 예외는 `SERVER_ERROR`로 응답하고 `log.error`로 스택을 남긴다.
- 기본 문장 대신 보여 줄 문장이 있으면 `new CustomException(ErrorCode.XXX, detail)`로 던진다(예: 정지 사유). `detail`에는 화면에 그대로 보여도 되는 문장만 넣는다. (#12, 2026-11-26)
- Security: 컨트롤러 안에서 난 `AuthenticationException`은 `UNAUTHORIZED`, `AccessDeniedException`은 `FORBIDDEN`으로 응답한다. 필터에서 막힌 401·403은 `SecurityConfig`가 같은 `ApiResponse`로 응답한다. (#12, 2026-11-26)
- DTO 검증 애너테이션에는 `message`를 한글로 적는다(예: `@NotBlank(message = "이메일을 입력해 주세요.")`). 적지 않으면 Hibernate Validator 기본 메시지(`must not be blank` 등)가 그대로 화면에 보일 수 있다.

## 문제은행의 기존 계약과 호환

QB-10에서 인증 브랜치를 통합하면서 기존 문제은행의 flat 성공 응답과 `{code,message}` 업무 오류를 유지한다. 해당 Controller의 오류 처리는 질문 범위에 한정해 전역 처리보다 먼저 적용한다. Security 필터와 그 밖의 API는 이 문서의 envelope를 따른다.

프론트의 문제은행 호출만 `responseFormat: "plain"`을 명시하며, 같은 요청에 envelope 오류가 오면 공통 parser로 읽는다. 다른 호출의 성공 형식 검사는 완화하지 않는다. 문제은행을 공통 envelope로 전환하려면 별도의 계약 변경으로 다룬다.

## 아직 정하지 않은 것
- `ErrorCode`의 약관 동의 코드(`REQUIRED_CONSENT_MISSING`, `DUPLICATE_CONSENT_TYPE`)에 맞는 약관 테이블이 ERD에 없다.
