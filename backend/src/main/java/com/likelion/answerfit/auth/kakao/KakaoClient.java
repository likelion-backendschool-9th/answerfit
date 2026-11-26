package com.likelion.answerfit.auth.kakao;

public interface KakaoClient {

    /** 인가 코드를 카카오 토큰으로 바꾸고 회원 정보를 가져온다. 카카오가 거절하면 KAKAO_AUTH_FAILED */
    KakaoUser fetchUser(String code, String redirectUri);
}
