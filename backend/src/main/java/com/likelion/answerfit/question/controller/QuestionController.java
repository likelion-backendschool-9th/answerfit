package com.likelion.answerfit.question.controller;

import java.security.Principal;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.likelion.answerfit.question.auth.QuestionAuthentication;
import com.likelion.answerfit.question.dto.request.QuestionSearchRequest;
import com.likelion.answerfit.question.dto.response.QuestionDetailResponse;
import com.likelion.answerfit.question.dto.response.QuestionListResponse;
import com.likelion.answerfit.question.service.QuestionQueryService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;

@RestController
@RequestMapping("/api/v1/learning/questions")
public class QuestionController {

    private final QuestionQueryService questionQueryService;

    public QuestionController(QuestionQueryService questionQueryService) {
        this.questionQueryService = questionQueryService;
    }

    @GetMapping
    public QuestionListResponse getQuestions(@Valid @ModelAttribute QuestionSearchRequest query, Principal principal) {
        return questionQueryService.getQuestions(query, QuestionAuthentication.requireMember(principal));
    }

    @GetMapping("/{questionId}")
    public QuestionDetailResponse getQuestion(
            @PathVariable("questionId") @Positive(message = "질문 ID는 양수여야 합니다.") Long questionId,
            Principal principal) {
        return questionQueryService.getQuestion(questionId, QuestionAuthentication.requireMember(principal));
    }
}
