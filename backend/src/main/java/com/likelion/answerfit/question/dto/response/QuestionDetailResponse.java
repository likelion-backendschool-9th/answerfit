package com.likelion.answerfit.question.dto.response;

import java.time.Instant;
import java.util.List;

import com.likelion.answerfit.question.entity.ModelAnswerStatus;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.entity.QuestionSource;
import com.likelion.answerfit.question.entity.QuestionStatus;

public record QuestionDetailResponse(
        String id,
        QuestionMajor major,
        CategoryItem category,
        String content,
        QuestionSource source,
        QuestionStatus status,
        Instant createdAt,
        Instant reviewedAt,
        long likeCount,
        boolean isLiked,
        boolean isMine,
        boolean isReported,
        boolean canEdit,
        boolean canDelete,
        boolean canReport,
        String modelAnswer,
        ModelAnswerStatus modelAnswerStatus,
        List<String> keywords,
        String rejectionReason,
        Neighbor previous,
        Neighbor next
) {

    public QuestionDetailResponse {
        keywords = List.copyOf(keywords);
    }

    public record CategoryItem(String id, String name) {
    }

    public record Neighbor(String id, String content) {
    }
}
