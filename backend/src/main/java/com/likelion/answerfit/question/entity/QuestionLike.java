package com.likelion.answerfit.question.entity;

import java.time.Instant;

import org.hibernate.annotations.CreationTimestamp;
import org.springframework.util.Assert;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "question_likes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class QuestionLike {

    @EmbeddedId
    private QuestionLikeId id;

    @MapsId("questionId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static QuestionLike create(Long userId, Question question) {
        Assert.notNull(userId, "회원 ID는 필수입니다.");
        Assert.notNull(question, "질문은 필수입니다.");
        // 은행 질문(승인된 질문)만 좋아요 대상
        Assert.isTrue(question.getStatus() == QuestionStatus.APPROVED, "승인된 질문만 좋아요할 수 있습니다.");
        QuestionLike like = new QuestionLike();
        like.id = new QuestionLikeId(userId, question.getId());
        like.question = question;
        return like;
    }
}
