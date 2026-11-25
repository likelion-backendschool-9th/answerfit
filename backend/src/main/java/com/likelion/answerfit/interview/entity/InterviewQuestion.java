package com.likelion.answerfit.interview.entity;

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
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "interview_questions",
        uniqueConstraints = @UniqueConstraint(name = "uk_interview_questions_session_seq", columnNames = {"session_id", "seq"})
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InterviewQuestion {

    private static final int MAX_SCORE = 100;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "seq", nullable = false)
    private Short seq;

    // NULL이면 메인 질문. 꼬리질문은 깊이와 무관하게 루트 메인 질문을 가리킨다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "main_question_id")
    private InterviewQuestion mainQuestion;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 20)
    private InterviewQuestionSource source;

    @Column(name = "bank_question_id")
    private Long bankQuestionId;

    @Column(name = "question_text", nullable = false, columnDefinition = "text")
    private String questionText;

    @Column(name = "intent", columnDefinition = "text")
    private String intent;

    @Column(name = "hint", columnDefinition = "text")
    private String hint;

    @Column(name = "asked_at", nullable = false)
    private Instant askedAt;

    @Column(name = "answer_text", columnDefinition = "text")
    private String answerText;

    @Column(name = "audio_key", length = 500)
    private String audioKey;

    @Column(name = "video_key", length = 500)
    private String videoKey;

    @Column(name = "answer_seconds")
    private Short answerSeconds;

    @Column(name = "gaze_score")
    private Short gazeScore;

    @Column(name = "answered_at")
    private Instant answeredAt;

    @Column(name = "competency_id")
    private Long competencyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private InterviewSession session;

    @Enumerated(EnumType.STRING)
    @Column(name = "interview_type", nullable = false, length = 20)
    private InterviewType interviewType;

    // TODO(ERD): DDL 컬럼명이 "interview_questions.liked_at"(점 포함)으로 내보내져 liked_at으로 매핑함. ERD 컬럼명 수정 필요
    @Column(name = "liked_at")
    private Instant likedAt;

    private InterviewQuestion(InterviewSession session, InterviewType interviewType, short seq,
                              InterviewQuestionSource source, String questionText) {
        Assert.notNull(session, "회차는 필수입니다.");
        Assert.notNull(interviewType, "면접 유형은 필수입니다.");
        Assert.isTrue(seq >= 1, "출제 순서는 1부터입니다.");
        Assert.hasText(questionText, "질문 내용은 필수입니다.");
        this.session = session;
        this.interviewType = interviewType;
        this.seq = seq;
        this.source = source;
        this.questionText = questionText;
        this.askedAt = Instant.now();
    }

    // 문제 은행 질문 출제. 질문 내용은 출제 시점 스냅샷이다.
    public static InterviewQuestion createFromBank(InterviewSession session, InterviewType interviewType, short seq,
                                                   Long bankQuestionId, String questionText, String hint) {
        // (CHECK) BANK일 때만 은행 질문 ID가 있다.
        Assert.notNull(bankQuestionId, "은행 질문 ID는 필수입니다.");
        InterviewQuestion question = new InterviewQuestion(session, interviewType, seq, InterviewQuestionSource.BANK, questionText);
        question.bankQuestionId = bankQuestionId;
        question.hint = hint;
        return question;
    }

    // AI 생성 메인 질문. 경험 면접이면 검증하는 역량을 함께 기록한다.
    public static InterviewQuestion createGenerated(InterviewSession session, InterviewType interviewType, short seq,
                                                    String questionText, String intent, String hint, Long competencyId) {
        Assert.isTrue(competencyId == null || interviewType == InterviewType.EXPERIENCE, "역량은 경험 면접 질문에만 지정합니다.");
        InterviewQuestion question = new InterviewQuestion(session, interviewType, seq, InterviewQuestionSource.GENERATED, questionText);
        question.intent = intent;
        question.hint = hint;
        question.competencyId = competencyId;
        return question;
    }

    // 꼬리질문은 항상 AI 생성이며 회차·유형·역량을 부모에서 물려받는다.
    public static InterviewQuestion createFollowUp(InterviewQuestion parent, short seq, String questionText,
                                                   String intent, String hint) {
        Assert.notNull(parent, "부모 질문은 필수입니다.");
        InterviewQuestion question = new InterviewQuestion(parent.session, parent.interviewType, seq,
                InterviewQuestionSource.GENERATED, questionText);
        question.mainQuestion = parent.isMain() ? parent : parent.mainQuestion;
        question.intent = intent;
        question.hint = hint;
        question.competencyId = parent.competencyId;
        return question;
    }

    // 답변은 한 번만 기록한다.
    public void recordAnswer(String answerText, String audioKey, String videoKey, Short answerSeconds, Short gazeScore) {
        Assert.state(answeredAt == null, "이미 답변이 기록된 질문입니다.");
        Assert.isTrue(answerSeconds == null || answerSeconds >= 0, "답변 시간은 0 이상입니다.");
        Assert.isTrue(gazeScore == null || (gazeScore >= 0 && gazeScore <= MAX_SCORE), "시선 점수는 0~100입니다.");
        this.answerText = answerText;
        this.audioKey = audioKey;
        this.videoKey = videoKey;
        this.answerSeconds = answerSeconds;
        this.gazeScore = gazeScore;
        this.answeredAt = Instant.now();
    }

    // 영상 삭제 배치가 호출한다.
    public void clearVideo() {
        this.videoKey = null;
    }

    public void like() {
        Assert.state(likedAt == null, "이미 좋아요한 질문입니다.");
        this.likedAt = Instant.now();
    }

    public void unlike() {
        Assert.state(likedAt != null, "좋아요하지 않은 질문입니다.");
        this.likedAt = null;
    }

    public boolean isMain() {
        return mainQuestion == null;
    }
}
