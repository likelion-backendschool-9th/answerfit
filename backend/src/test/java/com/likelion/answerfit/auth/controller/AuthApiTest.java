package com.likelion.answerfit.auth.controller;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.likelion.answerfit.auth.jwt.JwtConfig;
import com.likelion.answerfit.auth.service.SocialLoginService;
import com.likelion.answerfit.global.config.SecurityConfig;
import com.likelion.answerfit.global.exception.CustomException;
import com.likelion.answerfit.global.exception.ErrorCode;
import com.likelion.answerfit.question.auth.QuestionJwtAuthenticationConverter;
import com.likelion.answerfit.user.controller.MemberController;
import com.likelion.answerfit.user.dto.MemberResponse;
import com.likelion.answerfit.user.service.MemberService;

// 권한 확인 테스트: 지우지 않는다 (docs/testing.md)
@WebMvcTest({AuthController.class, MemberController.class})
@Import({SecurityConfig.class, JwtConfig.class})
class AuthApiTest {

    private static final String BODY = "{\"code\":\"code\",\"redirectUri\":\"http://localhost:3000/auth/kakao/callback\"}";

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private SocialLoginService socialLoginService;

    @MockitoBean
    private MemberService memberService;

    @MockitoBean
    private QuestionJwtAuthenticationConverter questionJwtAuthenticationConverter;

    @Test
    void 카카오_로그인은_토큰_없이_부를_수_있다() throws Exception {
        when(socialLoginService.loginWithKakao("code", "http://localhost:3000/auth/kakao/callback")).thenReturn("token");

        mvc.perform(post("/api/v1/auth/social/kakao").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("token"))
                .andExpect(jsonPath("$.error").doesNotExist());
    }

    @Test
    void 거절은_ApiResponse_실패_형식으로_답한다() throws Exception {
        when(socialLoginService.loginWithKakao("code", "http://localhost:3000/auth/kakao/callback"))
                .thenThrow(new CustomException(ErrorCode.EMAIL_ALREADY_REGISTERED));

        mvc.perform(post("/api/v1/auth/social/kakao").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.errorCode").value(ErrorCode.EMAIL_ALREADY_REGISTERED.getCode()))
                .andExpect(jsonPath("$.error.detail").value(ErrorCode.EMAIL_ALREADY_REGISTERED.getMessage()));
    }

    @Test
    void 정지_사유처럼_바꾼_문장은_detail로_나간다() throws Exception {
        when(socialLoginService.loginWithKakao("code", "http://localhost:3000/auth/kakao/callback"))
                .thenThrow(new CustomException(ErrorCode.SUSPENDED, "이용이 정지된 계정이에요. 사유: 반복 등록"));

        mvc.perform(post("/api/v1/auth/social/kakao").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.errorCode").value(ErrorCode.SUSPENDED.getCode()))
                .andExpect(jsonPath("$.error.detail").value("이용이 정지된 계정이에요. 사유: 반복 등록"));
    }

    @Test
    void 인가_코드가_없으면_400() throws Exception {
        mvc.perform(post("/api/v1/auth/social/kakao").contentType(MediaType.APPLICATION_JSON).content("{\"redirectUri\":\"x\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.errorCode").value(ErrorCode.INVALID_INPUT.getCode()));
    }

    @Test
    void 깨진_JSON은_INVALID_INPUT() throws Exception {
        mvc.perform(post("/api/v1/auth/social/kakao").contentType(MediaType.APPLICATION_JSON).content("{bad"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.errorCode").value(ErrorCode.INVALID_INPUT.getCode()));
    }

    @Test
    void 토큰이_없거나_틀리면_내_정보는_401() throws Exception {
        mvc.perform(get("/api/v1/members/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.errorCode").value(ErrorCode.UNAUTHORIZED.getCode()));
        mvc.perform(get("/api/v1/members/me").header("Authorization", "Bearer forged"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.errorCode").value(ErrorCode.UNAUTHORIZED.getCode()));
    }

    @Test
    void 로그인한_회원은_자기_정보를_받는다() throws Exception {
        when(memberService.getMe(7L)).thenReturn(new MemberResponse("jiwoo@kakao.com", "지우", "member"));

        mvc.perform(get("/api/v1/members/me").with(jwt().jwt(token -> token.subject("7"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("jiwoo@kakao.com"))
                .andExpect(jsonPath("$.data.nickname").value("지우"))
                .andExpect(jsonPath("$.data.role").value("member"));
    }

    @Test
    void 탈퇴한_회원의_토큰은_401() throws Exception {
        when(memberService.getMe(7L)).thenThrow(new CustomException(ErrorCode.UNAUTHORIZED));

        mvc.perform(get("/api/v1/members/me").with(jwt().jwt(token -> token.subject("7"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.errorCode").value(ErrorCode.UNAUTHORIZED.getCode()));
    }
}
