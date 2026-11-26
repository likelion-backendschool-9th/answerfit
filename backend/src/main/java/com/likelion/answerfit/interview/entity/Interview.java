package com.likelion.answerfit.interview.entity;

import java.math.BigDecimal;
import java.time.Instant;

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

// 회차 안의 유형별 섹션 (구 interview_sections)
@Entity
@Table(
        name = "interview",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_interview_session_type", columnNames = {"session_id", "interview_type"}),
                @UniqueConstraint(name = "uk_interview_session_order", columnNames = {"session_id", "section_order"})
        },
        indexes = @Index(name = "idx_interview_users_id", columnList = "users_id")
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Interview {

    private static final int MAX_SECTIONS = 3;
    private static final int MIN_QUESTIONS = 3;
    private static final int MAX_QUESTIONS = 8;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "section_order", nullable = false)
    private Short sectionOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "interview_type", nullable = false, length = 20)
    private InterviewType interviewType;

    @Column(name = "question_count", nullable = false)
    private Short questionCount;

    // TODO(ERD): mode는 회차의 run_mode와 겹치고 값 정의(주석)가 없음. 삭제 여부 확인. 일단 RunMode로 매핑
    @Enumerated(EnumType.STRING)
    @Column(name = "mode", length = 20)
    private RunMode mode;

    @Column(name = "avg_answer_score", precision = 5, scale = 2)
    private BigDecimal avgAnswerScore;

    @Column(name = "avg_gaze_score", precision = 5, scale = 2)
    private BigDecimal avgGazeScore;

    @Column(name = "avg_answer_seconds", precision = 6, scale = 1)
    private BigDecimal avgAnswerSeconds;

    @Column(name = "total_score", precision = 5, scale = 2)
    private BigDecimal totalScore;

    @Column(name = "analyzed_at")
    private Instant analyzedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private InterviewSession session;

    // 회차 목록은 이 값으로 회원의 섹션을 찾아 회차 단위로 묶는다. 한 회차의 섹션은 모두 같은 회원이어야 한다.
    @Column(name = "users_id", nullable = false)
    private Long usersId;

    @Column(name = "document_group_id")
    private Long documentGroupId;

    @Builder
    private Interview(InterviewSession session, Long usersId, short sectionOrder, InterviewType interviewType,
                      short questionCount, Long documentGroupId) {
        Assert.notNull(session, "회차는 필수입니다.");
        Assert.notNull(usersId, "회원 ID는 필수입니다.");
        Assert.notNull(interviewType, "면접 유형은 필수입니다.");
        Assert.isTrue(sectionOrder >= 1 && sectionOrder <= MAX_SECTIONS, "섹션 순서는 1~3입니다.");
        // 유형 묶기는 실전 모드 전용
        Assert.isTrue(sectionOrder == 1 || session.getRunMode() == RunMode.REAL, "유형 묶기는 실전 모드에서만 할 수 있습니다.");
        Assert.isTrue(questionCount >= MIN_QUESTIONS && questionCount <= MAX_QUESTIONS, "질문 수는 3~8개입니다.");
        Assert.isTrue(interviewType != InterviewType.EXPERIENCE || documentGroupId != null, "경험 면접은 서류 그룹이 필수입니다.");
        Assert.isTrue(interviewType != InterviewType.PT || documentGroupId == null, "PT 면접은 서류 그룹을 쓰지 않습니다.");
        this.session = session;
        this.usersId = usersId;
        this.sectionOrder = sectionOrder;
        this.interviewType = interviewType;
        this.questionCount = questionCount;
        this.documentGroupId = documentGroupId;
        this.mode = session.getRunMode();
    }

    // 분석 완료 시 1회만 기록하는 캐시 값
    public void recordResult(BigDecimal avgAnswerScore, BigDecimal avgGazeScore, BigDecimal avgAnswerSeconds,
                             BigDecimal totalScore) {
        Assert.state(analyzedAt == null, "이미 분석 결과가 기록된 섹션입니다.");
        Assert.notNull(totalScore, "종합 점수는 필수입니다.");
        this.avgAnswerScore = avgAnswerScore;
        this.avgGazeScore = avgGazeScore;
        this.avgAnswerSeconds = avgAnswerSeconds;
        this.totalScore = totalScore;
        this.analyzedAt = Instant.now();
    }
}
