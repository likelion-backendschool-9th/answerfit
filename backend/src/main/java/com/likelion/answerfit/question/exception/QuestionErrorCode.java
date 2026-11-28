package com.likelion.answerfit.question.exception;

import org.springframework.http.HttpStatus;

public enum QuestionErrorCode {
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "입력값을 확인해 주세요."),
    INVALID_CATEGORY(HttpStatus.BAD_REQUEST, "올바른 카테고리를 선택해 주세요."),
    INVALID_REPORT_REASON(HttpStatus.BAD_REQUEST, "올바른 신고 사유를 선택해 주세요."),
    UNAUTHENTICATED(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."),
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "이 요청을 처리할 권한이 없습니다."),
    SELF_REPORT_NOT_ALLOWED(HttpStatus.FORBIDDEN, "본인이 등록한 질문은 신고할 수 없습니다."),
    QUESTION_NOT_FOUND(HttpStatus.NOT_FOUND, "질문을 찾을 수 없습니다."),
    QUESTION_NOT_EDITABLE(HttpStatus.CONFLICT, "수정하거나 삭제할 수 없는 질문입니다."),
    ALREADY_REPORTED(HttpStatus.CONFLICT, "이미 신고한 질문입니다."),
    QUESTION_STATE_CHANGED(HttpStatus.CONFLICT, "질문의 상태가 변경되었습니다. 다시 확인해 주세요."),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");

    private final HttpStatus status;
    private final String message;

    QuestionErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getMessage() {
        return message;
    }
}
