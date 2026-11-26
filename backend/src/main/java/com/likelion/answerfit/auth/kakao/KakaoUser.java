package com.likelion.answerfit.auth.kakao;

/** 카카오 회원 정보 중 가입에 쓰는 값. email과 nickname은 없을 수 있다. */
public record KakaoUser(String id, String email, boolean emailVerified, String nickname) {
}
