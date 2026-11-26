package com.likelion.answerfit.global.exception;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Map;


public class ErrorResponse {
    private String type;
    private String errorCode;
    private String httpTitle;
    private int httpStatus;
    private String detail;
    private Map<String, String> validationErrors;
    private LocalDateTime timestamp;

    /**
     * 에러 반환 형식
     *
     * @param type              // 도메인 포함 전체 URL
     * @param errorCode         // 발생 에러 enum 코드
     */
    public ErrorResponse(String type, ErrorCode errorCode){
        this.type = type;
        this.errorCode = errorCode.getCode();
        this.httpTitle = errorCode.getHttpStatus().name();
        this.httpStatus = errorCode.getHttpStatus().value();
        this.detail = errorCode.getMessage();
        this.timestamp = LocalDateTime.now(ZoneId.of("Asia/Seoul"));
    }

    public ErrorResponse(String type, ErrorCode errorCode, Map<String, String> validationErrors){
        this.type = type;
        this.errorCode = errorCode.getCode();
        this.httpTitle = errorCode.getHttpStatus().name();
        this.httpStatus = errorCode.getHttpStatus().value();
        this.detail = errorCode.getMessage();
        this.validationErrors = validationErrors;
        this.timestamp = LocalDateTime.now(ZoneId.of("Asia/Seoul"));
    }

    public String getType() { return type; }
    public String getErrorCode() { return errorCode; }
    public String getHttpTitle() { return httpTitle; }
    public int getHttpStatus() {return httpStatus; }
    public String getDetail() { return detail; }
    public Map<String, String> getValidationErrors() { return validationErrors; }
    public LocalDateTime getTimestamp() { return timestamp; }
}