package com.likelion.answerfit.question.dto.response;

import com.likelion.answerfit.question.entity.QuestionStatus;

public record QuestionCreateResponse(String id, QuestionStatus status) {
}
