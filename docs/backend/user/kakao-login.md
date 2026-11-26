# 카카오 소셜 로그인 (#12)

결정은 [user README](README.md)를 따른다.

## 요구사항과 시나리오

- `#12-S1` [직접] 비회원이 로그인 화면에서 "카카오로 계속하기"를 누르면 카카오 로그인·동의 화면으로 간다.
- `#12-S2` 처음 온 카카오 계정이면 회원과 카카오 소셜 계정을 함께 만들고 로그인한다.
- `#12-S3` 이미 연결된 카카오 계정이면 그 회원으로 로그인한다.
- `#12-S4` [직접] 로그인하면 로그인 전에 보던 화면(없으면 홈, 관리자는 관리자 화면)으로 돌아온다.
- `#12-S5` 동의를 취소하거나, `state`가 맞지 않거나, 카카오 인증이 실패하면 로그인 화면으로 돌아와 안내를 본다.
- `#12-S6` 이용 정지된 회원은 정지 사유를 보고 로그인되지 않는다.
- `#12-S7` 카카오 이메일이 인증되지 않았으면 가입하지 않고 안내한다.
- `#12-S8` 같은 이메일의 회원이 이미 있으면 연결하지 않고 "이메일로 로그인해 주세요"라고 안내한다.
- `#12-S9` 로그인한 회원은 `GET /api/v1/members/me`로 자기 이메일, 닉네임, 역할을 받는다. 토큰이 없거나 틀리면 401이다.

## API

응답은 [API 응답 형식](../../api-response.md)대로 `ApiResponse`로 감싼다. 아래 표는 `data`와 `error.errorCode`만 적는다.

| 요청 | 성공 `data` |
| --- | --- |
| `POST /api/v1/auth/social/kakao` `{ code, redirectUri }` | `{ accessToken }` |
| `GET /api/v1/members/me` (Bearer) | `{ email, nickname, role: "member" \| "admin" }` |

| `ErrorCode` | 코드 | 상태 | 경우 |
| --- | --- | --- | --- |
| `KAKAO_AUTH_FAILED` | `BACKEND-INFRA-101` | 400 | 카카오가 인가 코드나 토큰을 거절했다(4xx) |
| `KAKAO_UNAVAILABLE` | `BACKEND-INFRA-102` | 502 | 카카오가 5xx로 답했거나, 연결하지 못했거나, 시간이 지났다(연결 3초, 응답 5초) |
| `KAKAO_NOT_CONFIGURED` | `BACKEND-INFRA-103` | 503 | `KAKAO_CLIENT_ID`·`KAKAO_CLIENT_SECRET`이 없다 |
| `EMAIL_NOT_VERIFIED` | `BACKEND-BUSINESS-108` | 403 | 카카오 이메일이 없거나 인증되지 않았다 |
| `EMAIL_ALREADY_REGISTERED` | `BACKEND-BUSINESS-109` | 409 | 같은 이메일의 회원이 있다 |
| `SUSPENDED` | `BACKEND-BUSINESS-110` | 403 | 이용 정지된 회원이다. `detail`에 정지 사유를 붙인다 |
| `WITHDRAWN` | `BACKEND-BUSINESS-111` | 403 | 탈퇴한 회원의 소셜 계정이다 |
| `UNAUTHORIZED` | `BACKEND-SECURITY-101` | 401 | 토큰이 없거나 틀렸다 |
| `INVALID_INPUT` | `BACKEND-GLOBAL-101` | 400 | 요청 값이 비었거나 JSON 형식이 깨졌다 |

프론트는 이 코드를 로그인 화면의 안내 코드로 바꿔 쓴다(`frontend/features/auth/kakao.ts`의 `socialErrorOf`).

## 닉네임

카카오 닉네임이 규칙(2~12자, 한글·영문·숫자)에 맞고 아직 쓰이지 않았으면 그대로 쓴다. 아니면 `회원` 뒤에 4~6자리 숫자를 붙여 만든다. 회원은 나중에 계정 설정에서 바꾼다.

같은 카카오 계정이나 같은 닉네임으로 동시에 가입하면 유일 조건에 걸린다. 그때는 새 트랜잭션으로 한 번만 다시 해서, 먼저 만든 회원으로 로그인하거나 다른 닉네임을 고른다.

## 범위 밖

- 리프레시 토큰, 로그아웃 API
- GitHub·구글 로그인, 계정 설정의 소셜 계정 연결·해제
- 탈퇴 후 재가입

## 작업 순서

1. 보안 의존성, JWT 발급·검증
2. 회원·소셜 계정 저장소, 카카오 클라이언트, 소셜 로그인 서비스와 API
3. `GET /api/v1/members/me`
4. 프론트: 카카오 동의 화면으로 보내기, 콜백 처리, 로그인 화면의 안내
5. 테스트 서버나 로컬에서 실제 카카오 계정으로 `#12-S1`, `#12-S4` 확인

## 가정

- 카카오 앱은 개인 개발자 비즈 앱이고, 카카오계정(이메일)과 닉네임을 필수 동의로 받는다.
- Redirect URI는 `http://localhost:3000/auth/kakao/callback`과 `http://answerfit.newlecture.com/auth/kakao/callback`을 등록했다.
- 백엔드는 프론트 서버만 부른다. 브라우저가 백엔드를 직접 부르지 않아 CORS 설정은 하지 않는다.

## 참고

- 카카오 로그인 REST API: https://developers.kakao.com/docs/ko/kakaologin/rest-api
  - 인가 `GET https://kauth.kakao.com/oauth/authorize`, 토큰 `POST https://kauth.kakao.com/oauth/token`, 회원 정보 `GET https://kapi.kakao.com/v2/user/me`
  - 클라이언트 시크릿을 켜 두면 토큰 요청에 꼭 넣어야 한다. 토큰 요청의 `redirect_uri`는 인가 요청과 같아야 한다.
  - 동의를 취소하면 Redirect URI로 `error=access_denied`가 온다. 등록하지 않은 Redirect URI는 `KOE006`이다.
  - 회원 식별은 `id`(Long)로 한다. 이메일 인증 여부는 `kakao_account.is_email_verified`다.
- 이메일 필수 동의는 비즈 앱에서만 설정할 수 있다: https://developers.kakao.com/docs/ko/app-setting/app
- 카카오 앱에는 키가 여러 개 있다. Redirect URI와 클라이언트 시크릿을 등록한 REST API 키 `AnswerFit`을 쓴다. 기본 키(Default Rest API Key)에는 Redirect URI가 없다.
