package com.likelion.answerfit.user.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.likelion.answerfit.global.common.ApiResponse;
import com.likelion.answerfit.user.dto.MemberResponse;
import com.likelion.answerfit.user.service.MemberService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    /** 토큰의 subject가 회원 id다 */
    @GetMapping("/me")
    public ApiResponse<MemberResponse> me(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.ok(memberService.getMe(Long.valueOf(jwt.getSubject())));
    }
}
