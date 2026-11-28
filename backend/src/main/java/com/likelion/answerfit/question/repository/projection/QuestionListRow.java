package com.likelion.answerfit.question.repository.projection;

import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.entity.QuestionSource;
import com.likelion.answerfit.question.entity.QuestionStatus;

public record QuestionListRow(
        Long id,
        QuestionMajor major,
        Long categoryId,
        String categoryName,
        String content,
        QuestionStatus status,
        QuestionSource source,
        Long authorId,
        long likeCount,
        boolean liked,
        boolean reported
) {
}
