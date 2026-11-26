package com.likelion.answerfit.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import com.likelion.answerfit.global.exception.CustomException;
import com.likelion.answerfit.global.exception.ErrorCode;
import com.likelion.answerfit.user.entity.User;
import com.likelion.answerfit.user.repository.UserRepository;
import com.likelion.answerfit.user.service.LocalSignupService.RequiredConsents;

class LocalSignupServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final LocalSignupService signup = new LocalSignupService(users);

    @Test
    void 이메일을_정규화하고_비밀번호_해시를_저장한다() {
        signup.register(" TEST@example.com ", "password1", "재현", new RequiredConsents(true, true, true));

        ArgumentCaptor<User> captured = ArgumentCaptor.forClass(User.class);
        verify(users).save(captured.capture());
        User user = captured.getValue();
        assertThat(user.getEmail()).isEqualTo("test@example.com");
        assertThat(user.getProfileImageKey()).isNull();
        assertThat(new BCryptPasswordEncoder().matches("password1", user.getPasswordHash())).isTrue();
    }

    @Test
    void 필수_동의가_빠지면_저장하기_전에_거절한다() {
        assertThatThrownBy(() -> signup.register("test@example.com", "password1", "재현",
                new RequiredConsents(true, true, false)))
                .isInstanceOfSatisfying(CustomException.class, error ->
                        assertThat(error.getErrorCode()).isEqualTo(ErrorCode.REQUIRED_CONSENT_MISSING));
        verifyNoInteractions(users);
    }

    @Test
    void 대소문자를_무시하고_이메일_중복을_확인한다() {
        when(users.existsByEmailIgnoreCase("test@example.com")).thenReturn(true);
        assertThatThrownBy(() -> signup.register("TEST@example.com", "password1", "재현",
                new RequiredConsents(true, true, true)))
                .isInstanceOfSatisfying(CustomException.class, error ->
                        assertThat(error.getErrorCode()).isEqualTo(ErrorCode.DUPLICATE_EMAIL));
    }
}
