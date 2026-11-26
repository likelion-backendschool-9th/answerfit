package com.likelion.answerfit.auth.controller;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;

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
import com.likelion.answerfit.global.error.ApiException;
import com.likelion.answerfit.global.error.ErrorCode;
import com.likelion.answerfit.user.controller.MemberController;
import com.likelion.answerfit.user.entity.User;
import com.likelion.answerfit.user.repository.UserRepository;

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
    private UserRepository userRepository;

    @Test
    void 카카오_로그인은_토큰_없이_부를_수_있다() throws Exception {
        when(socialLoginService.loginWithKakao("code", "http://localhost:3000/auth/kakao/callback")).thenReturn("token");

        mvc.perform(post("/api/v1/auth/social/kakao").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("token"));
    }

    @Test
    void 거절은_code와_message로_답한다() throws Exception {
        when(socialLoginService.loginWithKakao("code", "http://localhost:3000/auth/kakao/callback"))
                .thenThrow(new ApiException(ErrorCode.EMAIL_ALREADY_REGISTERED));

        mvc.perform(post("/api/v1/auth/social/kakao").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_ALREADY_REGISTERED"))
                .andExpect(jsonPath("$.message").value(ErrorCode.EMAIL_ALREADY_REGISTERED.getMessage()));
    }

    @Test
    void 인가_코드가_없으면_400() throws Exception {
        mvc.perform(post("/api/v1/auth/social/kakao").contentType(MediaType.APPLICATION_JSON).content("{\"redirectUri\":\"x\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void 깨진_JSON은_INVALID_REQUEST() throws Exception {
        mvc.perform(post("/api/v1/auth/social/kakao").contentType(MediaType.APPLICATION_JSON).content("{bad"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void 토큰이_없거나_틀리면_내_정보는_401() throws Exception {
        mvc.perform(get("/api/v1/members/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        mvc.perform(get("/api/v1/members/me").header("Authorization", "Bearer forged"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void 로그인한_회원은_자기_정보를_받는다() throws Exception {
        when(userRepository.findActiveById(7L)).thenReturn(Optional.of(User.createSocial("jiwoo@kakao.com", "지우")));

        mvc.perform(get("/api/v1/members/me").with(jwt().jwt(token -> token.subject("7"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("jiwoo@kakao.com"))
                .andExpect(jsonPath("$.nickname").value("지우"))
                .andExpect(jsonPath("$.role").value("member"));
    }

    @Test
    void 탈퇴한_회원의_토큰은_401() throws Exception {
        when(userRepository.findActiveById(7L)).thenReturn(Optional.empty());

        mvc.perform(get("/api/v1/members/me").with(jwt().jwt(token -> token.subject("7"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }
}
