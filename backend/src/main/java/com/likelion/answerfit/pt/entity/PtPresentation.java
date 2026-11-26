package com.likelion.answerfit.pt.entity;

import java.time.Instant;

import org.springframework.util.Assert;

import com.likelion.answerfit.interview.entity.InterviewSession;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

// PK가 곧 interview_sessions FK인 1:1. 흐름: 준비 시작 → 발표 시작(준비 20분 전 조기 시작 가능) → 발표 종료
@Entity
@Table(name = "pt_presentations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PtPresentation {

    @Id
    private Long id;

    // PK이자 회차(interview_sessions) FK
    @MapsId
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    private InterviewSession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pt_articles_id", nullable = false)
    private PtArticle article;

    @Column(name = "prep_started_at")
    private Instant prepStartedAt;

    @Column(name = "presentation_started_at")
    private Instant presentationStartedAt;

    @Column(name = "presentation_ended_at")
    private Instant presentationEndedAt;

    @Column(name = "memo_text", columnDefinition = "text")
    private String memoText;

    @Column(name = "video_key", length = 500)
    private String videoKey;

    @Column(name = "transcript", columnDefinition = "text")
    private String transcript;

    public PtPresentation(InterviewSession session, PtArticle article) {
        Assert.notNull(session, "회차는 필수입니다.");
        Assert.notNull(article, "기사는 필수입니다.");
        this.session = session;
        this.article = article;
    }

    public void startPrep() {
        Assert.state(prepStartedAt == null, "이미 준비를 시작했습니다.");
        this.prepStartedAt = Instant.now();
    }

    public void updateMemo(String memoText) {
        Assert.state(presentationEndedAt == null, "발표가 끝난 뒤에는 메모를 고칠 수 없습니다.");
        this.memoText = memoText;
    }

    public void startPresentation() {
        Assert.state(prepStartedAt != null, "준비를 시작한 뒤에 발표할 수 있습니다.");
        Assert.state(presentationStartedAt == null, "이미 발표를 시작했습니다.");
        this.presentationStartedAt = Instant.now();
    }

    public void endPresentation(String videoKey, String transcript) {
        Assert.state(presentationStartedAt != null, "발표를 시작하지 않았습니다.");
        Assert.state(presentationEndedAt == null, "이미 발표가 끝났습니다.");
        this.presentationEndedAt = Instant.now();
        this.videoKey = videoKey;
        this.transcript = transcript;
    }

    // 영상 삭제 배치가 호출한다.
    public void clearVideo() {
        this.videoKey = null;
    }
}
