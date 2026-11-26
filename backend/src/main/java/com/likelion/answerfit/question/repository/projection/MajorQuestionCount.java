package com.likelion.answerfit.question.repository.projection;

import com.likelion.answerfit.question.entity.QuestionMajor;

public record MajorQuestionCount(QuestionMajor major, long questionCount) {
}
