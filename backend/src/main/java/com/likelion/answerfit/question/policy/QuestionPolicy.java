package com.likelion.answerfit.question.policy;

import java.util.Objects;

import com.likelion.answerfit.question.auth.QuestionMember;
import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.Question;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.entity.QuestionSource;
import com.likelion.answerfit.question.entity.QuestionStatus;
import com.likelion.answerfit.question.exception.QuestionErrorCode;
import com.likelion.answerfit.question.exception.QuestionException;

public final class QuestionPolicy {

    private QuestionPolicy() {
    }

    public static boolean isPublic(Question question) {
        return question != null && question.getDeletedAt() == null
                && question.getStatus() == QuestionStatus.APPROVED;
    }

    public static boolean isMine(Question question, QuestionMember member) {
        return question != null && member != null
                && question.getSource() == QuestionSource.USER
                && Objects.equals(question.getAuthorId(), member.userId());
    }

    public static boolean canView(Question question, QuestionMember member) {
        return member != null && (isPublic(question) || canEdit(question, member));
    }

    public static boolean canEdit(Question question, QuestionMember member) {
        return isMine(question, member) && question.getDeletedAt() == null
                && (question.getStatus() == QuestionStatus.PENDING
                        || question.getStatus() == QuestionStatus.REJECTED);
    }

    public static boolean canReport(Question question, QuestionMember member) {
        return member != null && isPublic(question) && !isMine(question, member);
    }

    /** 카테고리 조회 후 호출한다. 존재 여부와 ID 조회는 Repository 연결 단계에서 처리한다. */
    public static void requireCsCategory(Category category) {
        if (category == null || category.getMajor() != QuestionMajor.CS) {
            throw new QuestionException(QuestionErrorCode.INVALID_CATEGORY);
        }
    }
}
