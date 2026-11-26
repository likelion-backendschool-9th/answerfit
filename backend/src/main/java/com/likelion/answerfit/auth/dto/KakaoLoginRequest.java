package com.likelion.answerfit.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record KakaoLoginRequest(
        @NotBlank(message = "인가 코드가 없어요.") String code,
        @NotBlank(message = "Redirect URI가 없어요.") String redirectUri) {
}
