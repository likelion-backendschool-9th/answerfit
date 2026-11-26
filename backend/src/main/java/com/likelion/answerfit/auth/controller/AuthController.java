package com.likelion.answerfit.auth.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.likelion.answerfit.auth.dto.KakaoLoginRequest;
import com.likelion.answerfit.auth.dto.TokenResponse;
import com.likelion.answerfit.auth.service.SocialLoginService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final SocialLoginService socialLoginService;

    @PostMapping("/social/kakao")
    public TokenResponse loginWithKakao(@Valid @RequestBody KakaoLoginRequest request) {
        return new TokenResponse(socialLoginService.loginWithKakao(request.code(), request.redirectUri()));
    }
}
