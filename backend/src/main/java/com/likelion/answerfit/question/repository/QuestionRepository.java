package com.likelion.answerfit.question.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.likelion.answerfit.question.entity.Question;

public interface QuestionRepository extends JpaRepository<Question, Long>, QuestionSearchRepository {
}
