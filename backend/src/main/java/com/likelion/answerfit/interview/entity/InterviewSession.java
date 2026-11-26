package com.likelion.answerfit.interview.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.util.Assert;
import org.springframework.util.StringUtils;

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
@Table(name = "interview_sessions", indexes = @Index(name = "idx_interview_sessions_video_expires_at", columnList = "video_expires_at"))
@SQLRestriction("deleted_at IS NULL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InterviewSession {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter TITLE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    // 회차의 주인은 섹션(Interview.usersId)으로 찾는다.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", nullable = false, length = 100)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "run_mode", nullable = false, length = 20)
    private RunMode runMode;

    @Enumerated(EnumType.STRING)
    @Column(name = "company_type", nullable = false, length = 20)
    private CompanyType companyType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private SessionStatus status;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    @Column(name = "total_score", precision = 5, scale = 2)
    private BigDecimal totalScore;

    @Column(name = "video_expires_at")
    private Instant videoExpiresAt;

    @Column(name = "videos_deleted_at")
    private Instant videosDeletedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "interview_date")
    private LocalDate interviewDate;

    @Builder
    private InterviewSession(String title, RunMode runMode, CompanyType companyType, LocalDate interviewDate) {
        Assert.notNull(runMode, "진행 모드는 필수입니다.");
        Assert.notNull(companyType, "기업 유형은 필수입니다.");
        this.startedAt = Instant.now();
        this.title = StringUtils.hasText(title) ? title : LocalDateTime.ofInstant(startedAt, KST).format(TITLE_FORMAT);
        this.runMode = runMode;
        this.companyType = companyType;
        this.status = SessionStatus.IN_PROGRESS;
        this.interviewDate = interviewDate;
        this.videoExpiresAt = calculateVideoExpiresAt(interviewDate);
    }

    public void changeTitle(String title) {
        Assert.hasText(title, "제목은 필수입니다.");
        this.title = title;
    }

    // 면접일이 바뀌면 영상 만료 일시를 다시 계산한다.
    public void changeInterviewDate(LocalDate interviewDate) {
        Assert.state(videosDeletedAt == null, "영상이 이미 삭제된 회차입니다.");
        this.interviewDate = interviewDate;
        this.videoExpiresAt = calculateVideoExpiresAt(interviewDate);
    }

    // 면접이 끝나 AI 분석을 시작한다.
    public void startAnalyzing() {
        Assert.state(status == SessionStatus.IN_PROGRESS, "진행 중인 회차만 분석을 시작할 수 있습니다.");
        this.status = SessionStatus.ANALYZING;
        this.endedAt = Instant.now();
    }

    // total_score는 분석 완료 시 1회만 기록하는 캐시 값이다.
    public void complete(BigDecimal totalScore) {
        Assert.state(status == SessionStatus.ANALYZING, "분석 중인 회차만 완료할 수 있습니다.");
        Assert.state(this.totalScore == null, "종합 점수는 이미 기록되었습니다.");
        Assert.notNull(totalScore, "종합 점수는 필수입니다.");
        this.status = SessionStatus.COMPLETED;
        this.totalScore = totalScore;
    }

    public void cancel() {
        Assert.state(status == SessionStatus.IN_PROGRESS, "진행 중인 회차만 취소할 수 있습니다.");
        this.status = SessionStatus.CANCELLED;
        this.endedAt = Instant.now();
    }

    // 영상 삭제 배치가 호출한다.
    public void markVideosDeleted() {
        Assert.state(videosDeletedAt == null, "영상이 이미 삭제된 회차입니다.");
        this.videosDeletedAt = Instant.now();
    }

    public void delete() {
        Assert.state(deletedAt == null, "이미 삭제된 회차입니다.");
        this.deletedAt = Instant.now();
    }

    // 실제 면접일 다음 날 0시(KST)
    // shortcut: 면접일이 없으면 NULL(보관 기간 미정). 기본 보관 기간이 정해지면 여기서 채운다.
    private static Instant calculateVideoExpiresAt(LocalDate interviewDate) {
        if (interviewDate == null) {
            return null;
        }
        return interviewDate.plusDays(1).atStartOfDay(KST).toInstant();
    }
}
