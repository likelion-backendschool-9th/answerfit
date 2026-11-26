package com.likelion.answerfit.global.exception;

import lombok.Getter;

@Getter
public class CustomException extends RuntimeException {

    private final ErrorCode errorCode;

    public CustomException(ErrorCode errorCode) {
        this(errorCode, errorCode.getMessage());
    }

    /** 정지 사유처럼 기본 문장 대신 보여 줄 문장이 있을 때. 화면에 그대로 보여도 되는 문장만 넣는다 */
    public CustomException(ErrorCode errorCode, String detail) {
        super(detail);
        this.errorCode = errorCode;
    }
}
