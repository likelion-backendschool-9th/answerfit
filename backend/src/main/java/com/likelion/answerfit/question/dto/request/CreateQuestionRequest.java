package com.likelion.answerfit.question.dto.request;

import com.likelion.answerfit.question.validation.CodePointLength;
import com.likelion.answerfit.question.validation.QuestionInputLimits;
import com.likelion.answerfit.question.validation.QuestionText;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CreateQuestionRequest(
        @NotNull(message = "카테고리는 필수입니다.")
        @Positive(message = "카테고리 ID는 양수여야 합니다.")
        Long categoryId,
        @NotBlank(message = "질문 내용은 필수입니다.")
        @CodePointLength(min = QuestionInputLimits.CONTENT_MIN, max = QuestionInputLimits.CONTENT_MAX)
        String content
) {

    public CreateQuestionRequest {
        content = QuestionText.trim(content);
    }
}
