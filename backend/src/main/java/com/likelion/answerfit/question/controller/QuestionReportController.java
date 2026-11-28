package com.likelion.answerfit.question.controller;

import java.security.Principal;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.likelion.answerfit.question.auth.QuestionAuthentication;
import com.likelion.answerfit.question.dto.request.CreateQuestionReportRequest;
import com.likelion.answerfit.question.dto.response.QuestionReportResponse;
import com.likelion.answerfit.question.service.QuestionReportService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;

@RestController
@RequestMapping("/api/v1/learning/questions")
public class QuestionReportController {

    private final QuestionReportService questionReportService;

    public QuestionReportController(QuestionReportService questionReportService) {
        this.questionReportService = questionReportService;
    }

    @PostMapping("/{questionId}/reports")
    public ResponseEntity<QuestionReportResponse> reportQuestion(
            @PathVariable("questionId") @Positive(message = "질문 ID는 양수여야 합니다.") Long questionId,
            @Valid @RequestBody CreateQuestionReportRequest request, Principal principal) {
        QuestionReportResponse response = questionReportService.reportQuestion(
                questionId, request, QuestionAuthentication.requireMember(principal));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
