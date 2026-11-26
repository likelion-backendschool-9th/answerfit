package com.likelion.answerfit.question.entity;

import org.springframework.util.Assert;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

// Question.addKeyword()로만 만든다.
@Entity
@Table(
        name = "question_keywords",
        uniqueConstraints = @UniqueConstraint(name = "uk_question_keywords_question_keyword", columnNames = {"question_id", "keyword"})
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class QuestionKeyword {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(name = "keyword", nullable = false, length = 100)
    private String keyword;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    QuestionKeyword(Question question, String keyword, int sortOrder) {
        Assert.notNull(question, "질문은 필수입니다.");
        Assert.hasText(keyword, "키워드는 필수입니다.");
        this.question = question;
        this.keyword = keyword;
        this.sortOrder = sortOrder;
    }
}
