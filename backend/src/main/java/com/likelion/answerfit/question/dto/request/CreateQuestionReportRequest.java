package com.likelion.answerfit.question.dto.request;

import com.likelion.answerfit.question.validation.CodePointLength;
import com.likelion.answerfit.question.validation.QuestionInputLimits;
import com.likelion.answerfit.question.validation.QuestionText;

public record CreateQuestionReportRequest(
        String reasonType,
        @CodePointLength(max = QuestionInputLimits.REPORT_DETAIL_MAX)
        String detail
) {

    public CreateQuestionReportRequest {
        detail = detail == null ? "" : QuestionText.trim(detail);
    }
}
