package com.likelion.answerfit.question.controller;

import java.security.Principal;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.likelion.answerfit.question.exception.QuestionPlainApi;
import com.likelion.answerfit.question.auth.QuestionAuthentication;
import com.likelion.answerfit.question.dto.response.CategoryResponse;
import com.likelion.answerfit.question.service.CategoryService;

@QuestionPlainApi
@RestController
@RequestMapping("/api/v1/categories")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    public CategoryResponse getCategories(Principal principal) {
        QuestionAuthentication.requireMember(principal);
        return categoryService.getCategories();
    }
}
