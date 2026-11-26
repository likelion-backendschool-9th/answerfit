package com.likelion.answerfit.user.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.likelion.answerfit.auth.jwt.JwtConfig;
import com.likelion.answerfit.global.config.SecurityConfig;
import com.likelion.answerfit.user.service.NicknameAvailabilityService;

@WebMvcTest(NicknameAvailabilityController.class)
@Import({SecurityConfig.class, JwtConfig.class})
class NicknameAvailabilityControllerTest {
    private static final String PATH = "/api/v1/auth/nickname-available";

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private NicknameAvailabilityService nicknames;

    @ParameterizedTest
    @ValueSource(strings = {"지우", "abc123abc123"})
    void 유효한_닉네임은_토큰_없이_조회한다(String nickname) throws Exception {
        when(nicknames.isAvailable(nickname)).thenReturn(true);

        mvc.perform(get(PATH).param("nickname", nickname))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.available").value(true))
                .andExpect(jsonPath("$.error").isEmpty());
    }

    @Test
    void 사용_중인_닉네임은_사용_불가로_응답한다() throws Exception {
        mvc.perform(get(PATH).param("nickname", "지우"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.available").value(false));
    }

    @ParameterizedTest
    @ValueSource(strings = {"a", "abc123abc1234", "지 우", "지우!"})
    void 유효하지_않은_닉네임은_거절한다(String nickname) throws Exception {
        mvc.perform(get(PATH).param("nickname", nickname))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.errorCode").value("BACKEND-GLOBAL-101"));
    }

    @Test
    void 닉네임이_없으면_거절한다() throws Exception {
        mvc.perform(get(PATH))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.errorCode").value("BACKEND-GLOBAL-101"));
    }
}
