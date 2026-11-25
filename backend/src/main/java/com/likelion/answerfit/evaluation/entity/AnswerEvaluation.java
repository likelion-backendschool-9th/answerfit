package com.likelion.answerfit.evaluation.entity;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;
import org.springframework.util.Assert;

import com.likelion.answerfit.interview.entity.InterviewQuestion;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

// PK가 곧 interview_questions FK인 1:1
@Entity
@Table(name = "answer_evaluations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AnswerEvaluation {

    private static final int MAX_SCORE = 100;
    private static final int MAX_ERROR_LENGTH = 500;

    @Id
    private Long questionId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id")
    private InterviewQuestion question;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private EvaluationStatus status;

    @Column(name = "accuracy_score")
    private Short accuracyScore;

    @Column(name = "nonverbal_score")
    private Short nonverbalScore;

    @Column(name = "total_score")
    private Short totalScore;

    @Column(name = "overall_comment", columnDefinition = "text")
    private String overallComment;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "study_keywords", columnDefinition = "text[]")
    private List<String> studyKeywords = new ArrayList<>();

    @Column(name = "interviewer_tip", columnDefinition = "text")
    private String interviewerTip;

    @Column(name = "nonverbal_comment", columnDefinition = "text")
    private String nonverbalComment;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "missing_keywords", columnDefinition = "text[]")
    private List<String> missingKeywords = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "matched_keywords", columnDefinition = "text[]")
    private List<String> matchedKeywords = new ArrayList<>();

    @Column(name = "llm_model", length = 50)
    private String llmModel;

    @Column(name = "prompt_version", length = 30)
    private String promptVersion;

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "evaluated_at")
    private Instant evaluatedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public AnswerEvaluation(InterviewQuestion question) {
        Assert.notNull(question, "질문은 필수입니다.");
        this.question = question;
        this.status = EvaluationStatus.PENDING;
    }

    // FAILED에서 다시 시작하면 재시도
    public void start() {
        Assert.state(status == EvaluationStatus.PENDING || status == EvaluationStatus.FAILED,
                "평가를 시작할 수 없는 상태입니다.");
        this.status = EvaluationStatus.RUNNING;
        this.errorMessage = null;
    }

    // 평가 결과는 한 번만 기록한다.
    public void complete(short accuracyScore, short nonverbalScore, short totalScore,
                         String overallComment, List<String> studyKeywords, String interviewerTip,
                         String nonverbalComment, List<String> missingKeywords, List<String> matchedKeywords,
                         String llmModel, String promptVersion) {
        Assert.state(status == EvaluationStatus.RUNNING, "평가 중인 답변만 결과를 기록할 수 있습니다.");
        validateScore(accuracyScore, "답변 정확도 점수");
        validateScore(nonverbalScore, "비언어 점수");
        validateScore(totalScore, "종합 점수");
        this.status = EvaluationStatus.DONE;
        this.accuracyScore = accuracyScore;
        this.nonverbalScore = nonverbalScore;
        this.totalScore = totalScore;
        this.overallComment = overallComment;
        this.studyKeywords = copyOf(studyKeywords);
        this.interviewerTip = interviewerTip;
        this.nonverbalComment = nonverbalComment;
        this.missingKeywords = copyOf(missingKeywords);
        this.matchedKeywords = copyOf(matchedKeywords);
        this.llmModel = llmModel;
        this.promptVersion = promptVersion;
        this.evaluatedAt = Instant.now();
    }

    public void fail(String errorMessage) {
        Assert.state(status == EvaluationStatus.RUNNING, "평가 중인 답변만 실패로 바꿀 수 있습니다.");
        this.status = EvaluationStatus.FAILED;
        this.errorMessage = errorMessage != null && errorMessage.length() > MAX_ERROR_LENGTH
                ? errorMessage.substring(0, MAX_ERROR_LENGTH)
                : errorMessage;
    }

    public List<String> getStudyKeywords() {
        return Collections.unmodifiableList(studyKeywords);
    }

    public List<String> getMissingKeywords() {
        return Collections.unmodifiableList(missingKeywords);
    }

    public List<String> getMatchedKeywords() {
        return Collections.unmodifiableList(matchedKeywords);
    }

    private static void validateScore(short score, String name) {
        Assert.isTrue(score >= 0 && score <= MAX_SCORE, name + "는 0~100입니다.");
    }

    private static List<String> copyOf(List<String> values) {
        return values == null ? new ArrayList<>() : new ArrayList<>(values);
    }
}
