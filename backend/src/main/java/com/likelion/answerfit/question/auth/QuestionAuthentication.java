package com.likelion.answerfit.question.auth;

import java.security.Principal;

import com.likelion.answerfit.question.exception.QuestionErrorCode;
import com.likelion.answerfit.question.exception.QuestionException;
import com.likelion.answerfit.user.entity.UserStatus;

public final class QuestionAuthentication {

    private QuestionAuthentication() {
    }

    /** Servlet의 검증된 principal을 소비한다. 토큰 검증은 공통 인증 처리가 담당한다. */
    public static QuestionMember requireMember(Principal principal) {
        if (!(principal instanceof QuestionPrincipal member)
                || member.userId() == null || member.userId() <= 0
                || member.role() == null || member.status() == null
                || member.deletedAt() != null) {
            throw new QuestionException(QuestionErrorCode.UNAUTHENTICATED);
        }
        if (member.status() != UserStatus.ACTIVE) {
            throw new QuestionException(QuestionErrorCode.ACCESS_DENIED);
        }
        return new QuestionMember(member.userId(), member.role());
    }
}
