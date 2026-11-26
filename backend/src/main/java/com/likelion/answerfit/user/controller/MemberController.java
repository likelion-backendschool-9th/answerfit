package com.likelion.answerfit.user.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.likelion.answerfit.global.error.ApiException;
import com.likelion.answerfit.global.error.ErrorCode;
import com.likelion.answerfit.user.dto.MemberResponse;
import com.likelion.answerfit.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/members")
@RequiredArgsConstructor
public class MemberController {

    private final UserRepository userRepository;

    /** 토큰은 맞지만 탈퇴한 회원이면 로그인하지 않은 것으로 본다 */
    @GetMapping("/me")
    @Transactional(readOnly = true)
    public MemberResponse me(@AuthenticationPrincipal Jwt jwt) {
        return userRepository.findActiveById(Long.valueOf(jwt.getSubject()))
                .map(MemberResponse::from)
                .orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED));
    }
}
