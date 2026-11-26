package com.likelion.answerfit.question.entity;

import java.time.Instant;

import org.hibernate.annotations.CreationTimestamp;
import org.springframework.util.Assert;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "question_moderations", indexes = @Index(name = "idx_question_moderations_question_id", columnList = "question_id"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class QuestionModeration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Enumerated(EnumType.STRING)
    @Column(name = "moderation_type", nullable = false, length = 20)
    private ModerationType moderationType;

    @Column(name = "reason", nullable = false, length = 500)
    private String reason;

    @Column(name = "moderator_id", nullable = false)
    private Long moderatorId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Builder
    private QuestionModeration(Question question, ModerationType moderationType, String reason, Long moderatorId) {
        Assert.notNull(question, "질문은 필수입니다.");
        Assert.notNull(moderationType, "조치 유형은 필수입니다.");
        Assert.hasText(reason, "조치 사유는 필수입니다.");
        Assert.notNull(moderatorId, "조치한 관리자 ID는 필수입니다.");
        this.question = question;
        this.moderationType = moderationType;
        this.reason = reason;
        this.moderatorId = moderatorId;
    }
}
