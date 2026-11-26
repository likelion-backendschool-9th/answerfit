package com.likelion.answerfit.global.error;

import org.springframework.http.HttpStatus;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** 응답의 code와 기본 문구. 문구는 화면에 그대로 보여도 되는 문장으로 쓴다. */
@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "요청 형식이 올바르지 않아요."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "로그인이 필요해요."),
    KAKAO_AUTH_FAILED(HttpStatus.BAD_REQUEST, "카카오 인증에 실패했어요. 다시 시도해 주세요."),
    KAKAO_UNAVAILABLE(HttpStatus.BAD_GATEWAY, "카카오 서버와 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요."),
    KAKAO_NOT_CONFIGURED(HttpStatus.SERVICE_UNAVAILABLE, "카카오 로그인이 아직 설정되지 않았어요."),
    EMAIL_NOT_VERIFIED(HttpStatus.FORBIDDEN, "카카오 계정의 이메일 인증을 마친 뒤 다시 시도해 주세요."),
    EMAIL_ALREADY_REGISTERED(HttpStatus.CONFLICT, "이메일로 가입한 계정이에요. 이메일로 로그인해 주세요."),
    SUSPENDED(HttpStatus.FORBIDDEN, "이용이 정지된 계정이에요."),
    WITHDRAWN(HttpStatus.FORBIDDEN, "탈퇴한 계정이에요.");

    private final HttpStatus status;
    private final String message;
}
