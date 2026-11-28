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
    DUPLICATE_CONSENT_TYPE(ErrorDomain.BUSINESS, "107", HttpStatus.BAD_REQUEST, "같은 약관 항목이 중복으로 전달되었습니다."),
    EMAIL_NOT_VERIFIED(ErrorDomain.BUSINESS, "108", HttpStatus.FORBIDDEN, "카카오 계정의 이메일 인증을 마친 뒤 다시 시도해 주세요."),
    EMAIL_ALREADY_REGISTERED(ErrorDomain.BUSINESS, "109", HttpStatus.CONFLICT, "이메일로 가입한 계정이에요. 이메일로 로그인해 주세요."),
    SUSPENDED(ErrorDomain.BUSINESS, "110", HttpStatus.FORBIDDEN, "이용이 정지된 계정이에요."),
    WITHDRAWN(ErrorDomain.BUSINESS, "111", HttpStatus.FORBIDDEN, "탈퇴한 계정이에요."),

    // 2xx: 관리자 문제은행
    ADMIN_QUESTION_NOT_FOUND(ErrorDomain.BUSINESS, "201", HttpStatus.NOT_FOUND, "질문을 찾을 수 없습니다."),
    ADMIN_REPORT_NOT_FOUND(ErrorDomain.BUSINESS, "202", HttpStatus.NOT_FOUND, "신고를 찾을 수 없습니다."),
    ADMIN_QUESTION_STATE_CHANGED(ErrorDomain.BUSINESS, "203", HttpStatus.CONFLICT, "질문의 상태가 변경되었습니다. 다시 확인해 주세요."),
    ADMIN_REPORT_ALREADY_HANDLED(ErrorDomain.BUSINESS, "204", HttpStatus.CONFLICT, "이미 처리된 신고가 있습니다. 다시 확인해 주세요."),
    ADMIN_REVISION_CONFLICT(ErrorDomain.BUSINESS, "205", HttpStatus.CONFLICT, "질문 내용이 변경되었습니다. 최신 내용을 확인해 주세요."),
    ADMIN_INVALID_CATEGORY(ErrorDomain.BUSINESS, "206", HttpStatus.BAD_REQUEST, "올바른 카테고리를 선택해 주세요."),
    ADMIN_INVALID_REPORT_SELECTION(ErrorDomain.BUSINESS, "207", HttpStatus.BAD_REQUEST, "같은 질문의 처리할 신고를 선택해 주세요."),
    ADMIN_INVALID_ACTION(ErrorDomain.BUSINESS, "208", HttpStatus.BAD_REQUEST, "올바른 작업을 선택해 주세요."),

    // ===== INFRA: 외부 연동 =====
    // 1xx: 카카오
    KAKAO_AUTH_FAILED(ErrorDomain.INFRA, "101", HttpStatus.BAD_REQUEST, "카카오 인증에 실패했어요. 다시 시도해 주세요."),
    KAKAO_UNAVAILABLE(ErrorDomain.INFRA, "102", HttpStatus.BAD_GATEWAY, "카카오 서버와 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요."),
    KAKAO_NOT_CONFIGURED(ErrorDomain.INFRA, "103", HttpStatus.SERVICE_UNAVAILABLE, "카카오 로그인이 아직 설정되지 않았어요."),

    // 2xx: 문제은행 답안 생성 연동
    QUESTION_AI_NOT_CONFIGURED(ErrorDomain.INFRA, "201", HttpStatus.SERVICE_UNAVAILABLE, "문제은행 답안 생성이 아직 설정되지 않았어요."),
    QUESTION_AI_UNAVAILABLE(ErrorDomain.INFRA, "202", HttpStatus.BAD_GATEWAY, "답안 생성 서버와 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.");


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
