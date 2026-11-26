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
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "question_reports",
        uniqueConstraints = @UniqueConstraint(name = "uk_question_reports_question_reporter", columnNames = {"question_id", "reporter_id"}),
        indexes = @Index(name = "idx_question_reports_status", columnList = "status")
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class QuestionReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(name = "reporter_id", nullable = false)
    private Long reporterId;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason_type", nullable = false, length = 30)
    private ReportReasonType reasonType;

    // 300 code point는 H2에서 최대 600 UTF-16 코드 단위가 될 수 있다.
    @Column(name = "reason", length = 600)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ReportStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "moderation_id")
    private QuestionModeration moderation;

    @Column(name = "handled_by")
    private Long handledBy;

    @Column(name = "handled_at")
    private Instant handledAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Builder
    private QuestionReport(Question question, Long reporterId, ReportReasonType reasonType, String reason) {
        Assert.notNull(question, "질문은 필수입니다.");
        Assert.notNull(reporterId, "신고자 ID는 필수입니다.");
        Assert.notNull(reasonType, "신고 사유 유형은 필수입니다.");
        this.question = question;
        this.reporterId = reporterId;
        this.reasonType = reasonType;
        this.reason = reason;
        this.status = ReportStatus.PENDING;
    }

    // (CHECK) ACCEPTED면 조치 필수. 같은 질문의 신고 여러 건을 조치 1건으로 묶는다.
    public void accept(QuestionModeration moderation, Long adminId) {
        Assert.state(status == ReportStatus.PENDING, "대기 중인 신고만 처리할 수 있습니다.");
        Assert.notNull(moderation, "조치 기록은 필수입니다.");
        Assert.notNull(adminId, "처리한 관리자 ID는 필수입니다.");
        this.status = ReportStatus.ACCEPTED;
        this.moderation = moderation;
        this.handledBy = adminId;
        this.handledAt = Instant.now();
    }

    public void dismiss(Long adminId) {
        Assert.state(status == ReportStatus.PENDING, "대기 중인 신고만 처리할 수 있습니다.");
        Assert.notNull(adminId, "처리한 관리자 ID는 필수입니다.");
        this.status = ReportStatus.DISMISSED;
        this.handledBy = adminId;
        this.handledAt = Instant.now();
    }
}
