package com.likelion.answerfit.question.repository;

import com.likelion.answerfit.question.repository.projection.QuestionSearchResult;

public interface QuestionSearchRepository {

    QuestionSearchResult search(QuestionSearchCondition condition, int page, int pageSize);
}
