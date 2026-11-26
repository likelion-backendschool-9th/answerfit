package com.likelion.answerfit.user.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.likelion.answerfit.global.common.ApiResponse;
import com.likelion.answerfit.user.service.NicknameAvailabilityService;

import jakarta.validation.constraints.Pattern;

@RestController
@RequestMapping("/api/v1/auth")
public class NicknameAvailabilityController {
    private final NicknameAvailabilityService nicknames;

    public NicknameAvailabilityController(NicknameAvailabilityService nicknames) {
        this.nicknames = nicknames;
    }

    @GetMapping("/nickname-available")
    public ApiResponse<AvailabilityResponse> check(
            @RequestParam
            @Pattern(regexp = "[가-힣A-Za-z0-9]{2,12}", message = "닉네임은 2~12자의 한글, 영문, 숫자만 사용할 수 있습니다.")
            String nickname) {
        return ApiResponse.ok(new AvailabilityResponse(nicknames.isAvailable(nickname)));
    }

    public record AvailabilityResponse(boolean available) {}
}
