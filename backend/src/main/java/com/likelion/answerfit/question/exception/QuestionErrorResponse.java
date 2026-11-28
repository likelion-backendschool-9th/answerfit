package com.likelion.answerfit.question.exception;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

public record QuestionErrorResponse(
        String code,
        String message,
        @JsonInclude(JsonInclude.Include.NON_EMPTY) List<FieldError> fieldErrors
) {

    public QuestionErrorResponse {
        fieldErrors = fieldErrors == null ? List.of() : List.copyOf(fieldErrors);
    }

    public static QuestionErrorResponse from(QuestionErrorCode errorCode) {
        return from(errorCode, List.of());
    }

    public static QuestionErrorResponse from(QuestionErrorCode errorCode, List<FieldError> fieldErrors) {
        return new QuestionErrorResponse(errorCode.name(), errorCode.getMessage(), fieldErrors);
    }

    public record FieldError(String field, String message) {
    }
}
