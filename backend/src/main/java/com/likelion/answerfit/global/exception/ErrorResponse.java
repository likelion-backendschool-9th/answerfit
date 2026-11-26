package com.likelion.answerfit.global.exception;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Map;

import lombok.Getter;

@Getter
public class ErrorResponse {
    private final String type;
    private final String errorCode;
    private final String httpTitle;
    private final int httpStatus;
    private final String detail;
    private final Map<String, String> validationErrors;
    private final OffsetDateTime timestamp;

    /**
     * 에러 반환 형식
     *
     * @param type              // 요청 경로 (예: /api/users/1). 서버 호스트는 넣지 않는다.
     * @param errorCode         // 발생 에러 enum 코드
     */
    public ErrorResponse(String type, ErrorCode errorCode) {
        this(type, errorCode, null);
    }

    public ErrorResponse(String type, ErrorCode errorCode, Map<String, String> validationErrors) {
        this(type, errorCode, errorCode.getMessage(), validationErrors);
    }

    /** detail: 기본 문장 대신 보여 줄 문장 (CustomException의 메시지) */
    public ErrorResponse(String type, ErrorCode errorCode, String detail, Map<String, String> validationErrors) {
        this.type = type;
        this.errorCode = errorCode.getCode();
        this.httpTitle = errorCode.getHttpStatus().name();
        this.httpStatus = errorCode.getHttpStatus().value();
        this.detail = detail;
        this.validationErrors = validationErrors;
        this.timestamp = OffsetDateTime.now(ZoneId.of("Asia/Seoul"));
    }
}
