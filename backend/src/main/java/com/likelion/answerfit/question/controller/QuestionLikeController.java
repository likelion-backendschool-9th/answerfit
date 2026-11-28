package com.likelion.answerfit.question.controller;

import java.security.Principal;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.likelion.answerfit.question.auth.QuestionAuthentication;
import com.likelion.answerfit.question.dto.response.QuestionLikeResponse;
import com.likelion.answerfit.question.service.QuestionLikeService;

import jakarta.validation.constraints.Positive;

@RestController
@RequestMapping("/api/v1/learning/questions")
public class QuestionLikeController {

    private final QuestionLikeService questionLikeService;

    public QuestionLikeController(QuestionLikeService questionLikeService) {
        this.questionLikeService = questionLikeService;
    }

    @PostMapping("/{questionId}/likes")
    public QuestionLikeResponse likeQuestion(
            @PathVariable("questionId") @Positive(message = "질문 ID는 양수여야 합니다.") Long questionId,
            Principal principal) {
        return questionLikeService.likeQuestion(questionId, QuestionAuthentication.requireMember(principal));
    }

    @DeleteMapping("/{questionId}/likes")
    public QuestionLikeResponse unlikeQuestion(
            @PathVariable("questionId") @Positive(message = "질문 ID는 양수여야 합니다.") Long questionId,
            Principal principal) {
        return questionLikeService.unlikeQuestion(questionId, QuestionAuthentication.requireMember(principal));
    }
}
