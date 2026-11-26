package com.likelion.answerfit.user.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import com.likelion.answerfit.user.repository.UserProfileImageRepository;
import com.likelion.answerfit.user.repository.UserRepository;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class LocalSignupControllerTest {
    @Autowired private MockMvc mvc;
    @Autowired private UserRepository users;
    @Autowired private UserProfileImageRepository images;

    @Test
    void 비회원이_사진을_첨부해_가입하면_회원과_사진이_저장된다() throws Exception {
        var image = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB), "png", image);
        mvc.perform(form("NEW@example.com", "재현")
                        .file(new MockMultipartFile("photo", "profile.png", "image/png", image.toByteArray()))
                        .param("interviewRecording", "true"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isEmpty());

        var member = users.findAll().stream().filter(user -> user.getEmail().equals("new@example.com")).findFirst().orElseThrow();
        assertThat(member.getProfileImageKey()).isNotNull();
        assertThat(images.existsById(member.getProfileImageKey())).isTrue();
    }

    @Test
    void 필수_동의_하나가_누락되면_가입을_거절한다() throws Exception {
        mvc.perform(form("missing@example.com", "미동의"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.errorCode").value("BACKEND-BUSINESS-106"));
        assertThat(users.existsByEmailIgnoreCase("missing@example.com")).isFalse();
    }

    private MockMultipartHttpServletRequestBuilder form(String email, String nickname) {
        var request = multipart("/api/v1/auth/signup");
        request.param("email", email).param("nickname", nickname).param("password", "password1")
                .param("termsOfService", "true").param("privacyCollection", "true");
        return request;
    }
}
