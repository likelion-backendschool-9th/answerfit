package com.likelion.answerfit.interview.entity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import org.junit.jupiter.api.Test;

class InterviewSessionTest {

    private InterviewSession session(RunMode runMode, LocalDate interviewDate) {
        return InterviewSession.builder().runMode(runMode).companyType(CompanyType.PRIVATE).interviewDate(interviewDate).build();
    }

    @Test
    void 제목이_없으면_시작_시각으로_채운다() {
        assertThat(session(RunMode.PRACTICE, null).getTitle()).matches("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}");
    }

    @Test
    void 영상은_면접일_다음_날_0시_KST에_만료된다() {
        InterviewSession session = session(RunMode.REAL, LocalDate.of(2026, 12, 1));

        // 2026-12-02 00:00 KST = 2026-12-01 15:00 UTC
        assertThat(session.getVideoExpiresAt()).isEqualTo(Instant.parse("2026-12-01T15:00:00Z"));

        session.changeInterviewDate(null);
        assertThat(session.getVideoExpiresAt()).isNull();
    }

    @Test
    void 종합_점수는_분석_완료_때_한_번만_기록한다() {
        InterviewSession session = session(RunMode.REAL, null);
        assertThatThrownBy(() -> session.complete(BigDecimal.TEN)).isInstanceOf(IllegalStateException.class);

        session.startAnalyzing();
        session.complete(BigDecimal.TEN);

        assertThatThrownBy(() -> session.complete(BigDecimal.ONE)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 유형_묶기는_실전_모드에서만_된다() {
        assertThatThrownBy(() -> Interview.builder().session(session(RunMode.PRACTICE, null)).usersId(1L)
                .sectionOrder((short) 2).interviewType(InterviewType.CS).questionCount((short) 3).build())
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void 질문_수는_3에서_8개다() {
        InterviewSession session = session(RunMode.REAL, null);
        assertThatThrownBy(() -> Interview.builder().session(session).usersId(1L).sectionOrder((short) 1)
                .interviewType(InterviewType.CS).questionCount((short) 9).build())
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(Interview.builder().session(session).usersId(1L).sectionOrder((short) 1)
                .interviewType(InterviewType.CS).questionCount((short) 8).build().getQuestionCount()).isEqualTo((short) 8);
    }

    @Test
    void 꼬리질문은_깊이와_무관하게_루트_메인_질문을_가리킨다() {
        InterviewSession session = session(RunMode.REAL, null);
        InterviewQuestion main = InterviewQuestion.createGenerated(session, InterviewType.CS, (short) 1, "Q1", null, null, null);
        InterviewQuestion followUp = InterviewQuestion.createFollowUp(main, (short) 2, "Q1-1", null, null);
        InterviewQuestion deeper = InterviewQuestion.createFollowUp(followUp, (short) 3, "Q1-1-1", null, null);

        assertThat(deeper.getMainQuestion()).isSameAs(main);
        assertThat(deeper.getSource()).isEqualTo(InterviewQuestionSource.GENERATED);
    }
}
