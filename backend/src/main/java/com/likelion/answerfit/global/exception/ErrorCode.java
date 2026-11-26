package com.likelion.answerfit.global.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {

    // ===== GLOBAL: 모든 서비스 공통 =====
    INVALID_INPUT(ErrorDomain.GLOBAL, "101", HttpStatus.BAD_REQUEST, "잘못된 입력값입니다."),
    SERVER_ERROR(ErrorDomain.GLOBAL, "102", HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류가 발생했습니다."),
    API_NOT_FOUND(ErrorDomain.GLOBAL, "103", HttpStatus.NOT_FOUND, "요청한 API를 찾을 수 없습니다."),
    METHOD_NOT_ALLOWED(ErrorDomain.GLOBAL, "104", HttpStatus.METHOD_NOT_ALLOWED, "지원하지 않는 요청 방식입니다."),
    UNSUPPORTED_MEDIA_TYPE(ErrorDomain.GLOBAL, "105", HttpStatus.UNSUPPORTED_MEDIA_TYPE, "지원하지 않는 Content-Type입니다."),

    // ===== SECURITY: 인증·인가 =====
    // 1xx: 일반
    UNAUTHORIZED(ErrorDomain.SECURITY, "101", HttpStatus.UNAUTHORIZED, "인증 자격 증명이 유효하지 않습니다."),
    FORBIDDEN(ErrorDomain.SECURITY, "102", HttpStatus.FORBIDDEN, "접근 권한이 없습니다."),

    // 2xx: 리프레시 토큰
    REFRESH_TOKEN_MISSING(ErrorDomain.SECURITY, "201", HttpStatus.UNAUTHORIZED, "리프레시 토큰이 없습니다."),
    REFRESH_TOKEN_EXPIRED(ErrorDomain.SECURITY, "202", HttpStatus.UNAUTHORIZED, "로그인이 만료되었습니다. 다시 로그인해 주세요."),
    REFRESH_TOKEN_INVALID(ErrorDomain.SECURITY, "203", HttpStatus.UNAUTHORIZED, "유효하지 않은 리프레시 토큰입니다."),

    // ===== BUSINESS =====
    // 1xx: 회원가입·로그인·계정
    LOGIN_FAILED(ErrorDomain.BUSINESS, "101", HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 일치하지 않습니다."),
    LOGIN_PROVIDER_MISMATCH(ErrorDomain.BUSINESS, "102", HttpStatus.UNAUTHORIZED, "접근하신 로그인 방식이 유효하지 않습니다."),
    USER_NOT_FOUND(ErrorDomain.BUSINESS, "103", HttpStatus.NOT_FOUND, "존재하지 않는 회원입니다."),
    DUPLICATE_EMAIL(ErrorDomain.BUSINESS, "104", HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다."),
    DUPLICATE_NICKNAME(ErrorDomain.BUSINESS, "105", HttpStatus.CONFLICT, "이미 사용 중인 닉네임입니다."),
    REQUIRED_CONSENT_MISSING(ErrorDomain.BUSINESS, "106", HttpStatus.BAD_REQUEST, "필수 약관에 모두 동의해야 가입할 수 있습니다."),
    DUPLICATE_CONSENT_TYPE(ErrorDomain.BUSINESS, "107", HttpStatus.BAD_REQUEST, "같은 약관 항목이 중복으로 전달되었습니다.");


    private final static String SERVICE_DOMAIN = "BACKEND";
    private final ErrorDomain domain;       // 도메인 (GLOBAL, SECURITY, BUSINESS, INFRA)
    private final String sequence;          // 도메인 안의 순번 (101, 102 등). 백의 자리가 대역이다 (예: BUSINESS 1xx = 계정)
    private final HttpStatus httpStatus;    // HTTP 상태 코드 (400, 401 등)
    private final String message;           // 클라이언트용 메시지

    ErrorCode(ErrorDomain domain, String sequence, HttpStatus httpStatus, String message) {
        this.domain = domain;
        this.sequence = sequence;
        this.httpStatus = httpStatus;
        this.message = message;
    }

    public String getCode() { return SERVICE_DOMAIN+"-"+domain+"-"+sequence; }
    public String getMessage() { return message; }
    public HttpStatus getHttpStatus() { return httpStatus; }

    enum ErrorDomain {
        GLOBAL,
        SECURITY,
        BUSINESS,
        INFRA
    }
}
