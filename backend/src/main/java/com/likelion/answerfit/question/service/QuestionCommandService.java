package com.likelion.answerfit.question.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.likelion.answerfit.question.auth.QuestionMember;
import com.likelion.answerfit.question.dto.request.CreateQuestionRequest;
import com.likelion.answerfit.question.dto.response.QuestionCreateResponse;
import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.Question;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.exception.QuestionErrorCode;
import com.likelion.answerfit.question.exception.QuestionException;
import com.likelion.answerfit.question.policy.QuestionPolicy;
import com.likelion.answerfit.question.repository.CategoryRepository;
import com.likelion.answerfit.question.repository.QuestionRepository;

@Service
@Transactional
public class QuestionCommandService {

    private final QuestionRepository questionRepository;
    private final CategoryRepository categoryRepository;

    public QuestionCommandService(QuestionRepository questionRepository, CategoryRepository categoryRepository) {
        this.questionRepository = questionRepository;
        this.categoryRepository = categoryRepository;
    }

    public QuestionCreateResponse createQuestion(CreateQuestionRequest request, QuestionMember member) {
        Category category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new QuestionException(QuestionErrorCode.INVALID_CATEGORY));
        QuestionPolicy.requireCsCategory(category);

        Question question = Question.createByUser(QuestionMajor.CS, category, request.content(), member.userId());
        Question saved = questionRepository.save(question);
        return new QuestionCreateResponse(saved.getId().toString(), saved.getStatus());
    }
}
