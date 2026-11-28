package com.likelion.answerfit.question.dto.response;

import com.likelion.answerfit.question.entity.ReportStatus;

public record QuestionReportResponse(String id, ReportStatus status) {
}
