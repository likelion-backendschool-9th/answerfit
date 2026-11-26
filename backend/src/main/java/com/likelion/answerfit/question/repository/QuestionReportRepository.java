package com.likelion.answerfit.question.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.likelion.answerfit.question.entity.QuestionReport;

public interface QuestionReportRepository extends JpaRepository<QuestionReport, Long> {

    boolean existsByQuestionIdAndReporterId(Long questionId, Long reporterId);
}
