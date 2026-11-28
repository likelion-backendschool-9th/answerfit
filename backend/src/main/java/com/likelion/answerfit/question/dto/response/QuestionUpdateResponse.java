package com.likelion.answerfit.question.dto.response;

import com.likelion.answerfit.question.entity.QuestionStatus;

public record QuestionUpdateResponse(String id, QuestionStatus status, boolean canEdit, boolean canDelete) {
}
