package com.likelion.answerfit.question.admin.auth;

import java.security.Principal;

import org.jspecify.annotations.Nullable;

import com.likelion.answerfit.global.exception.CustomException;
import com.likelion.answerfit.global.exception.ErrorCode;
import com.likelion.answerfit.question.auth.QuestionPrincipal;
import com.likelion.answerfit.user.entity.Role;
import com.likelion.answerfit.user.entity.UserStatus;

public final class AdminQuestionAuthentication {

    private AdminQuestionAuthentication() {
    }

    /** 공통 JWT 검증기가 현재 DB에서 읽어 전달한 principal만 소비한다. */
    public static AdminQuestionActor requireAdmin(Principal principal) {
        ErrorCode failure = failure(principal);
        if (failure != null) {
            throw new CustomException(failure);
        }
        return new AdminQuestionActor(((QuestionPrincipal) principal).userId());
    }

    /** HTTP 인가와 모듈 진입점에서 동일한 관리자 판정 규칙을 사용한다. */
    public static boolean canAccess(Principal principal) {
        return failure(principal) == null;
    }

    private static @Nullable ErrorCode failure(Principal principal) {
        if (!(principal instanceof QuestionPrincipal member)
                || member.userId() == null || member.userId() <= 0
                || member.role() == null || member.status() == null
                || member.deletedAt() != null) {
            return ErrorCode.UNAUTHORIZED;
        }
        if (member.status() != UserStatus.ACTIVE || member.role() != Role.ADMIN) {
            return ErrorCode.FORBIDDEN;
        }
        return null;
    }
}
