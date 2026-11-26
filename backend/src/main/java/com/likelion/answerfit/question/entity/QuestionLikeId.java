package com.likelion.answerfit.question.entity;

import java.io.Serializable;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class QuestionLikeId implements Serializable {

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "question_id", nullable = false)
    private Long questionId;

    public QuestionLikeId(Long userId, Long questionId) {
        this.userId = userId;
        this.questionId = questionId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof QuestionLikeId other)) {
            return false;
        }
        return Objects.equals(userId, other.userId) && Objects.equals(questionId, other.questionId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, questionId);
    }
}
