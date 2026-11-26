package com.likelion.answerfit.question.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.likelion.answerfit.question.auth.QuestionMember;
import com.likelion.answerfit.question.dto.request.CreateQuestionReportRequest;
import com.likelion.answerfit.question.dto.response.QuestionReportResponse;
import com.likelion.answerfit.question.entity.Question;
import com.likelion.answerfit.question.entity.QuestionReport;
import com.likelion.answerfit.question.entity.ReportReasonType;
import com.likelion.answerfit.question.exception.QuestionErrorCode;
import com.likelion.answerfit.question.exception.QuestionException;
import com.likelion.answerfit.question.policy.QuestionPolicy;
import com.likelion.answerfit.question.repository.QuestionReportRepository;
import com.likelion.answerfit.question.repository.QuestionRepository;

@Service
@Transactional
public class QuestionReportService {

    private final QuestionRepository questionRepository;
    private final QuestionReportRepository questionReportRepository;

    public QuestionReportService(QuestionRepository questionRepository, QuestionReportRepository questionReportRepository) {
        this.questionRepository = questionRepository;
        this.questionReportRepository = questionReportRepository;
    }

    public QuestionReportResponse reportQuestion(Long questionId, CreateQuestionReportRequest request, QuestionMember member) {
        ReportReasonType reasonType = parseReasonType(request.reasonType());
        Question question = questionRepository.findForUpdateById(questionId)
                .orElseThrow(() -> new QuestionException(QuestionErrorCode.QUESTION_NOT_FOUND));
        if (!QuestionPolicy.isPublic(question)) {
            throw new QuestionException(QuestionErrorCode.QUESTION_NOT_FOUND);
        }
        if (QuestionPolicy.isMine(question, member)) {
            throw new QuestionException(QuestionErrorCode.SELF_REPORT_NOT_ALLOWED);
        }
        if (questionReportRepository.existsByQuestionIdAndReporterId(questionId, member.userId())) {
            throw new QuestionException(QuestionErrorCode.ALREADY_REPORTED);
        }

        QuestionReport report = QuestionReport.builder().question(question).reporterId(member.userId())
                .reasonType(reasonType).reason(request.detail()).build();
        QuestionReport saved = questionReportRepository.saveAndFlush(report);
        return new QuestionReportResponse(saved.getId().toString(), saved.getStatus());
    }

    private static ReportReasonType parseReasonType(String reasonType) {
        if (reasonType != null) {
            try {
                return ReportReasonType.valueOf(reasonType);
            } catch (IllegalArgumentException ignored) {
                // 요청에 허용된 enum 이름만 받는다.
            }
        }
        throw new QuestionException(QuestionErrorCode.INVALID_REPORT_REASON);
    }
}
