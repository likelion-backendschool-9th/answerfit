# 테스트 규칙

바꾼 범위에 맞는 검사만 실행한다. 커밋이나 PR을 만든다는 이유로 다시 실행하지 않는다.

| 바꾼 것 | 실행 (백엔드는 `backend/`, 프론트는 `frontend/`에서) |
| --- | --- |
| 문서만 | `git diff --check` |
| 프론트 코드 | `npm run typecheck`, `npm run lint`, `npm run structure`, `npm test` |
| 백엔드 코드 | `./gradlew test` |
| 백엔드 의존성·빌드 설정 | `./gradlew build` |
| 프론트 의존성·빌드 설정·서버/클라이언트 경계 | 위에 더해 `npm run build` |

- 코드·설정·환경이 그대로면 앞서 통과한 결과를 재사용한다.
- 성공은 종료 코드와 마지막 요약만 본다. 실패하면 실패한 테스트부터 다시 실행한다.
- 경계값은 단위 테스트로 확인한다. 프론트는 `frontend/tests/unit/`에 둔다.
- 권한·개인정보를 확인하는 테스트는 지우지 않는다.
