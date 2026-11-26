package com.likelion.answerfit.auth.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.likelion.answerfit.auth.dto.KakaoLoginRequest;
import com.likelion.answerfit.auth.dto.TokenResponse;
import com.likelion.answerfit.auth.service.SocialLoginService;
import com.likelion.answerfit.global.common.ApiResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final SocialLoginService socialLoginService;

    @PostMapping("/social/kakao")
    public ApiResponse<TokenResponse> loginWithKakao(@Valid @RequestBody KakaoLoginRequest request) {
        return ApiResponse.ok(new TokenResponse(socialLoginService.loginWithKakao(request.code(), request.redirectUri())));
    }
}
