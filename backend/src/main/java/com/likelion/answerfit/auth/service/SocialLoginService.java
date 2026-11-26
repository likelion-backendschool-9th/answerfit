package com.likelion.answerfit.auth.service;

/** docs/backend/user/kakao-login.md */
public interface SocialLoginService {

    /** 연결된 회원이면 로그인하고, 처음 온 카카오 계정이면 가입시킨다. 우리 서비스의 액세스 토큰을 돌려준다. */
    String loginWithKakao(String code, String redirectUri);
}
