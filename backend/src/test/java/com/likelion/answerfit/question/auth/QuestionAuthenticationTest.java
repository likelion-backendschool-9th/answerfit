package com.likelion.answerfit.question.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.security.Principal;
import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import com.likelion.answerfit.question.exception.QuestionErrorCode;
import com.likelion.answerfit.question.exception.QuestionException;
import com.likelion.answerfit.user.entity.Role;
import com.likelion.answerfit.user.entity.UserStatus;

class QuestionAuthenticationTest {

    @ParameterizedTest
    @EnumSource(Role.class)
    void 정상_회원과_관리자의_검증된_정보를_전달한다(Role role) {
        QuestionPrincipal principal = new VerifiedPrincipal(7L, role, UserStatus.ACTIVE, null);

        assertThat(QuestionAuthentication.requireMember(principal))
                .isEqualTo(new QuestionMember(7L, role));
    }

    @Test
    void 인증되지_않은_요청을_거절한다() {
        assertRejected(null, QuestionErrorCode.UNAUTHENTICATED);
    }

    @Test
    void 이름만_회원_ID인_principal을_인증_계약으로_간주하지_않는다() {
        assertRejected(() -> "7", QuestionErrorCode.UNAUTHENTICATED);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(longs = {0, -1})
    void 잘못된_회원_ID를_거절한다(Long userId) {
        assertRejected(new VerifiedPrincipal(userId, Role.USER, UserStatus.ACTIVE, null),
                QuestionErrorCode.UNAUTHENTICATED);
    }

    @Test
    void 권한이나_계정_상태가_없는_정보를_거절한다() {
        assertRejected(new VerifiedPrincipal(7L, null, UserStatus.ACTIVE, null),
                QuestionErrorCode.UNAUTHENTICATED);
        assertRejected(new VerifiedPrincipal(7L, Role.USER, null, null),
                QuestionErrorCode.UNAUTHENTICATED);
    }

    @Test
    void 이용정지_회원의_접근을_거절한다() {
        assertRejected(new VerifiedPrincipal(7L, Role.USER, UserStatus.SUSPENDED, null),
                QuestionErrorCode.ACCESS_DENIED);
    }

    @Test
    void 탈퇴_회원은_정상_상태_정보가_남아_있어도_인증으로_인정하지_않는다() {
        assertRejected(new VerifiedPrincipal(7L, Role.USER, UserStatus.ACTIVE, Instant.now()),
                QuestionErrorCode.UNAUTHENTICATED);
    }

    private void assertRejected(Principal principal, QuestionErrorCode expected) {
        assertThatThrownBy(() -> QuestionAuthentication.requireMember(principal))
                .isInstanceOfSatisfying(QuestionException.class,
                        error -> assertThat(error.getErrorCode()).isEqualTo(expected));
    }

    private record VerifiedPrincipal(Long userId, Role role, UserStatus status, Instant deletedAt)
            implements QuestionPrincipal {
    }
}
