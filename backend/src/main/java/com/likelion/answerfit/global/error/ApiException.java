package com.likelion.answerfit.global.error;

import lombok.Getter;

/** 이유를 담아 요청을 거절한다. GlobalExceptionHandler가 { code, message }로 바꾼다. */
@Getter
public class ApiException extends RuntimeException {

    private final ErrorCode errorCode;

    public ApiException(ErrorCode errorCode) {
        this(errorCode, errorCode.getMessage());
    }

    public ApiException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}
