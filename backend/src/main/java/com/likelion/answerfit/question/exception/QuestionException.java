package com.likelion.answerfit.question.exception;

import java.util.Objects;

public class QuestionException extends RuntimeException {

    private final QuestionErrorCode errorCode;

    public QuestionException(QuestionErrorCode errorCode) {
        super(Objects.requireNonNull(errorCode).getMessage());
        this.errorCode = errorCode;
    }

    public QuestionErrorCode getErrorCode() {
        return errorCode;
    }
}
