package com.likelion.answerfit.document.entity;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;
import org.springframework.util.Assert;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user_experiences", indexes = @Index(name = "idx_user_experiences_user_id", columnList = "user_id"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserExperience {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", nullable = false, length = 100)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "activity_type", length = 20)
    private ActivityType activityType;

    @Column(name = "started_on")
    private LocalDate startedOn;

    @Column(name = "ended_on")
    private LocalDate endedOn;

    @Column(name = "content", nullable = false, columnDefinition = "text")
    private String content;

    @Column(name = "result", columnDefinition = "text")
    private String result;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "competencies", nullable = false, columnDefinition = "text[]")
    private List<String> competencies = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Builder
    private UserExperience(Long userId, String title, ActivityType activityType, LocalDate startedOn,
                           LocalDate endedOn, String content, String result, List<String> competencies) {
        Assert.notNull(userId, "회원 ID는 필수입니다.");
        this.userId = userId;
        apply(title, activityType, startedOn, endedOn, content, result, competencies);
    }

    public void update(String title, ActivityType activityType, LocalDate startedOn, LocalDate endedOn,
                       String content, String result, List<String> competencies) {
        apply(title, activityType, startedOn, endedOn, content, result, competencies);
    }

    public List<String> getCompetencies() {
        return Collections.unmodifiableList(competencies);
    }

    private void apply(String title, ActivityType activityType, LocalDate startedOn, LocalDate endedOn,
                       String content, String result, List<String> competencies) {
        Assert.hasText(title, "경험 제목은 필수입니다.");
        Assert.hasText(content, "경험 내용은 필수입니다.");
        // (CHECK) 종료일은 시작일 이후
        Assert.isTrue(startedOn == null || endedOn == null || !endedOn.isBefore(startedOn),
                "종료일은 시작일 이후여야 합니다.");
        this.title = title;
        this.activityType = activityType;
        this.startedOn = startedOn;
        this.endedOn = endedOn;
        this.content = content;
        this.result = result;
        this.competencies = competencies == null ? new ArrayList<>() : new ArrayList<>(competencies);
    }
}
