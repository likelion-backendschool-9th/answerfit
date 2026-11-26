package com.likelion.answerfit.question.repository;

import com.likelion.answerfit.question.dto.QuestionSort;
import com.likelion.answerfit.question.entity.QuestionMajor;

public record QuestionSearchCondition(
        QuestionMajor major,
        Long categoryId,
        String keyword,
        boolean likedOnly,
        QuestionSort sort,
        long userId
) {
}
