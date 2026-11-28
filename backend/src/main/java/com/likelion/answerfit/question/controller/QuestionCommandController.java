package com.likelion.answerfit.question.controller;

import java.net.URI;
import java.security.Principal;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.likelion.answerfit.question.exception.QuestionPlainApi;
import com.likelion.answerfit.question.auth.QuestionAuthentication;
import com.likelion.answerfit.question.dto.request.CreateQuestionRequest;
import com.likelion.answerfit.question.dto.request.UpdateQuestionRequest;
import com.likelion.answerfit.question.dto.response.QuestionCreateResponse;
import com.likelion.answerfit.question.dto.response.QuestionUpdateResponse;
import com.likelion.answerfit.question.service.QuestionCommandService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;

@QuestionPlainApi
@RestController
@RequestMapping("/api/v1/learning/questions")
public class QuestionCommandController {

    private final QuestionCommandService questionCommandService;

    public QuestionCommandController(QuestionCommandService questionCommandService) {
        this.questionCommandService = questionCommandService;
    }

    @PostMapping
    public ResponseEntity<QuestionCreateResponse> createQuestion(
            @Valid @RequestBody CreateQuestionRequest request, Principal principal) {
        QuestionCreateResponse response = questionCommandService.createQuestion(
                request, QuestionAuthentication.requireMember(principal));
        return ResponseEntity.created(URI.create("/api/v1/learning/questions/" + response.id())).body(response);
    }

    @PatchMapping("/{questionId}")
    public QuestionUpdateResponse updateQuestion(
            @PathVariable("questionId") @Positive(message = "질문 ID는 양수여야 합니다.") Long questionId,
            @Valid @RequestBody UpdateQuestionRequest request, Principal principal) {
        return questionCommandService.updateQuestion(questionId, request, QuestionAuthentication.requireMember(principal));
    }

    @DeleteMapping("/{questionId}")
    public ResponseEntity<Void> deleteQuestion(
            @PathVariable("questionId") @Positive(message = "질문 ID는 양수여야 합니다.") Long questionId,
            Principal principal) {
        questionCommandService.deleteQuestion(questionId, QuestionAuthentication.requireMember(principal));
        return ResponseEntity.noContent().build();
    }
}
