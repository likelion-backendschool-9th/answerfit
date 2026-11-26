package com.likelion.answerfit.global.common;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.likelion.answerfit.global.exception.ErrorResponse;

import lombok.Getter;


@Getter
public class ApiResponse<T> {
    private final boolean success;
    private final T data;
    private final ErrorResponse error;

    @JsonCreator
    private ApiResponse( @JsonProperty("success") boolean success,
                         @JsonProperty("data") T data,
                         @JsonProperty("error") ErrorResponse error
    ) {
        this.success = success;
        this.data = data;
        this.error = error;
    }


    // 데이터 전송 성공 (200, 201 등)
    public static <T> ApiResponse<T> ok(T data){
        return new ApiResponse<>(true, data, null);
    }

    // 단순 완료 (204 등)
    public static ApiResponse<Void> ok() {
        return new ApiResponse<>(true, null, null);
    }

    // 실패
    public static ApiResponse<Void> fail(ErrorResponse errorResponse) {
        return new ApiResponse<>(false, null, errorResponse);
    }
}
