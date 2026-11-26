# 로그인

백엔드: [user README](../../backend/user/README.md) · 주소 `/login`, `/auth/kakao/callback`

## 카카오 로그인 (#12)

시나리오는 [kakao-login.md](../../backend/user/kakao-login.md)를 따른다.

1. "카카오로 계속하기"를 누르면 서버 액션이 `state`를 만든다. `state`와 돌아갈 주소를 httpOnly 쿠키(`kakao-login`, 10분)에 두고 카카오 인가 주소로 보낸다.
2. 카카오가 `/auth/kakao/callback`으로 돌려보내면 라우트 핸들러가 쿠키의 `state`와 비교한다. 맞으면 인가 코드를 백엔드 `POST /api/v1/auth/social/kakao`로 넘기고, 받은 토큰으로 로그인한다.
3. 실패하면 `/login?error=<코드>`로 보낸다. 로그인 화면은 코드에 맞는 안내를 소셜 버튼 아래에 보인다. 모르는 코드는 안내하지 않는다.
   - 백엔드가 보낸 문장(정지 사유 등)은 주소에 넣지 않고 1분짜리 쿠키(`login-notice`)로 넘긴다. 주소에 문장을 넣으면 누구나 가짜 안내를 담은 링크를 만들 수 있다.
   - 쿠키에는 오류 코드를 함께 담고, 주소의 코드와 같을 때만 그 문장을 쓴다. 앞선 실패의 문장이 다른 실패의 안내를 덮지 않게 하기 위해서다.

- 목업 모드에서는 카카오로 가지 않고 시연 회원으로 바로 로그인한다.
- 소셜 로그인은 "로그인 상태 유지"를 따르지 않고, 브라우저를 닫을 때까지 유지한다.

## 환경 변수

| 이름 | 설명 |
| --- | --- |
| `KAKAO_CLIENT_ID` | 카카오 앱 REST API 키(`AnswerFit`). 없으면 카카오 버튼이 "설정되지 않았어요"라고 안내한다 |
| `SITE_URL` | 이 사이트의 주소. Redirect URI `{SITE_URL}/auth/kakao/callback`을 만든다 |
