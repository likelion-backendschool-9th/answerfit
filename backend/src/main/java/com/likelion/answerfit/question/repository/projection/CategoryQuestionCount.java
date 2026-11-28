package com.likelion.answerfit.question.repository.projection;

import com.likelion.answerfit.question.entity.QuestionMajor;

public record CategoryQuestionCount(
        Long id,
        QuestionMajor major,
        String name,
        Integer sortOrder,
        long questionCount
) {
}
