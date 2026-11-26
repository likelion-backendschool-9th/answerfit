package com.likelion.answerfit.user.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.likelion.answerfit.global.common.ApiResponse;
import com.likelion.answerfit.user.service.LocalSignupService;
import com.likelion.answerfit.user.service.LocalSignupService.RequiredConsents;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class LocalSignupController {
    private final LocalSignupService signup;

    @GetMapping("/email-availability")
    public ApiResponse<EmailAvailability> checkEmail(
            @RequestParam @NotBlank(message = "이메일을 입력해 주세요.")
            @Email(message = "이메일 형식이 올바르지 않습니다.")
            @Size(max = 254, message = "이메일은 254자 이하로 입력해 주세요.") String email) {
        return ApiResponse.ok(new EmailAvailability(signup.isEmailAvailable(email)));
    }

    @PostMapping(path = "/signup", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Void> register(@Valid @ModelAttribute SignupForm form) {
        signup.register(form.email(), form.password(), form.nickname(),
                new RequiredConsents(Boolean.TRUE.equals(form.termsOfService()),
                        Boolean.TRUE.equals(form.privacyCollection()), Boolean.TRUE.equals(form.interviewRecording())), form.photo());
        return ApiResponse.ok();
    }

    public record EmailAvailability(boolean available) {}

    public record SignupForm(
            @NotBlank(message = "이메일을 입력해 주세요.")
            @Email(message = "이메일 형식이 올바르지 않습니다.")
            @Size(max = 254, message = "이메일은 254자 이하로 입력해 주세요.") String email,
            @NotBlank(message = "비밀번호를 입력해 주세요.")
            @Pattern(regexp = "(?s)(?=.*[A-Za-z])(?=.*[0-9]).{8,72}",
                    message = "비밀번호는 영문과 숫자를 포함해 8~72자로 입력해 주세요.") String password,
            @NotBlank(message = "닉네임을 입력해 주세요.")
            @Pattern(regexp = "[가-힣A-Za-z0-9]{2,12}",
                    message = "닉네임은 한글, 영문, 숫자 2~12자로 입력해 주세요.") String nickname,
            Boolean termsOfService, Boolean privacyCollection, Boolean interviewRecording, MultipartFile photo
    ) {}
}
