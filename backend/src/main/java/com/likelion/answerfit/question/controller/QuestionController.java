package com.likelion.answerfit.question.controller;

import java.security.Principal;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.likelion.answerfit.question.auth.QuestionAuthentication;
import com.likelion.answerfit.question.dto.request.QuestionSearchRequest;
import com.likelion.answerfit.question.dto.response.QuestionListResponse;
import com.likelion.answerfit.question.service.QuestionQueryService;

import jakarta.validation.Valid;

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
}
