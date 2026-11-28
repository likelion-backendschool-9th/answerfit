package com.likelion.answerfit.question.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.likelion.answerfit.question.entity.QuestionLike;
import com.likelion.answerfit.question.entity.QuestionLikeId;

public interface QuestionLikeRepository extends JpaRepository<QuestionLike, QuestionLikeId> {

    long countByIdQuestionId(Long questionId);
}
