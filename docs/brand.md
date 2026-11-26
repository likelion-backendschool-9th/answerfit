# 브랜드 로고

코드: 워드마크 `frontend/app/_components/Wordmark`, 헤더·푸터 Lockup `frontend/app/_components/BrandLogo`

## 정한 것

- 워드마크는 `ANSWERFIT` 한 덩어리다. ANSWER는 color/accent(밝은 배경 `#3567DB`, 어두운 배경 `#7EA1F7`), FIT는 color/brand(밝은 배경 `#1D2C6B`, 어두운 배경 `#E9EDF6`)다. (#27, 2026-11-26)
- 글꼴은 Familjen Grotesk Bold, 자간 -1%다. 글꼴을 내려받지 않도록 글자를 SVG 경로(아웃라인)로 바꿔 넣었다. (#27, 2026-11-26)
- 헤더·푸터·로그인은 아이콘(`/brand/logo-light.png`)과 워드마크를 나란히 둔 Lockup을 쓴다. 관리자 사이드바처럼 어두운 배경에서는 `tone="dark"`를 쓴다. (#27, 2026-11-26)
- 로고 둘레는 로고 높이의 50% 이상 비우고, 워드마크 높이는 14px보다 작게 쓰지 않는다. (#27, 2026-11-26)
- 두 색을 바꾸거나, 그라디언트를 넣거나, 기울이거나, ANSWER와 FIT 사이를 띄우지 않는다. (#27, 2026-11-26)

## 참고

- 경로를 다시 만들 때: Google Fonts의 Familjen Grotesk 700(TTF)을 opentype.js로 읽어 글자마다 `glyph.getPath`로 경로를 만든다. 글자 사이는 글꼴의 커닝에 글자 크기의 -1%를 더해 띄운다. ANSWER(앞 6글자)와 FIT(뒤 3글자)를 따로 모아 두 `<path>`로 넣는다. 글자 크기 100 기준 viewBox는 `0.67 -66.25 523.83 67.5`다.
