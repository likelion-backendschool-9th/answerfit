package com.likelion.answerfit.question.dto.request;

import com.likelion.answerfit.question.validation.CodePointLength;
import com.likelion.answerfit.question.validation.QuestionInputLimits;
import com.likelion.answerfit.question.validation.QuestionText;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Positive;

public record UpdateQuestionRequest(
        @Positive(message = "카테고리 ID는 양수여야 합니다.")
        Long categoryId,
        @CodePointLength(min = QuestionInputLimits.CONTENT_MIN, max = QuestionInputLimits.CONTENT_MAX)
        String content
) {

    public UpdateQuestionRequest {
        content = QuestionText.trim(content);
    }

    @AssertTrue(message = "수정할 카테고리 또는 질문 내용을 전달해 주세요.")
    public boolean isChangeRequested() {
        return categoryId != null || content != null;
    }
}
