package com.likelion.answerfit.question.admin.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.security.Principal;
import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import com.likelion.answerfit.global.exception.CustomException;
import com.likelion.answerfit.global.exception.ErrorCode;
import com.likelion.answerfit.question.auth.QuestionPrincipal;
import com.likelion.answerfit.user.entity.Role;
import com.likelion.answerfit.user.entity.UserStatus;

class AdminQuestionAuthenticationTest {

    @Test
    void 정상_관리자의_검증된_회원_ID를_전달한다() {
        var principal = new VerifiedPrincipal(7L, Role.ADMIN, UserStatus.ACTIVE, null);

        assertThat(AdminQuestionAuthentication.requireAdmin(principal)).isEqualTo(new AdminQuestionActor(7L));
        assertThat(AdminQuestionAuthentication.canAccess(principal)).isTrue();
    }

    @Test
    void 인증되지_않은_요청을_거절한다() {
        assertRejected(null, ErrorCode.UNAUTHORIZED);
    }

    @Test
    void 이름만_관리자_ID인_principal을_인증_계약으로_간주하지_않는다() {
        assertRejected(() -> "7", ErrorCode.UNAUTHORIZED);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(longs = {0, -1})
    void 잘못된_회원_ID를_거절한다(Long userId) {
        assertRejected(new VerifiedPrincipal(userId, Role.ADMIN, UserStatus.ACTIVE, null), ErrorCode.UNAUTHORIZED);
    }

    @Test
    void 권한이나_계정_상태가_없는_정보를_거절한다() {
        assertRejected(new VerifiedPrincipal(7L, null, UserStatus.ACTIVE, null), ErrorCode.UNAUTHORIZED);
        assertRejected(new VerifiedPrincipal(7L, Role.ADMIN, null, null), ErrorCode.UNAUTHORIZED);
    }

    @Test
    void 정상_일반_회원은_관리자_인가를_통과하지_못한다() {
        assertRejected(new VerifiedPrincipal(7L, Role.USER, UserStatus.ACTIVE, null), ErrorCode.FORBIDDEN);
    }

    @Test
    void 이용정지된_관리자의_접근을_거절한다() {
        assertRejected(new VerifiedPrincipal(7L, Role.ADMIN, UserStatus.SUSPENDED, null), ErrorCode.FORBIDDEN);
    }

    @Test
    void 탈퇴_관리자는_정상_상태가_남아_있어도_인증으로_인정하지_않는다() {
        assertRejected(new VerifiedPrincipal(7L, Role.ADMIN, UserStatus.ACTIVE, Instant.now()), ErrorCode.UNAUTHORIZED);
    }

    private void assertRejected(Principal principal, ErrorCode expected) {
        assertThat(AdminQuestionAuthentication.canAccess(principal)).isFalse();
        assertThatThrownBy(() -> AdminQuestionAuthentication.requireAdmin(principal))
                .isInstanceOfSatisfying(CustomException.class,
                        error -> assertThat(error.getErrorCode()).isEqualTo(expected));
    }

    private record VerifiedPrincipal(Long userId, Role role, UserStatus status, Instant deletedAt)
            implements QuestionPrincipal {
    }
}
