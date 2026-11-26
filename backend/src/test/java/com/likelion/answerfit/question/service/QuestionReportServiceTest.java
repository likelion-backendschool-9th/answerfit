package com.likelion.answerfit.question.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.dao.DataIntegrityViolationException;

import com.likelion.answerfit.question.auth.QuestionMember;
import com.likelion.answerfit.question.dto.request.CreateQuestionReportRequest;
import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.ModelAnswerStatus;
import com.likelion.answerfit.question.entity.Question;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.entity.QuestionReport;
import com.likelion.answerfit.question.entity.QuestionSource;
import com.likelion.answerfit.question.entity.QuestionStatus;
import com.likelion.answerfit.question.entity.ReportReasonType;
import com.likelion.answerfit.question.entity.ReportStatus;
import com.likelion.answerfit.question.exception.QuestionErrorCode;
import com.likelion.answerfit.question.exception.QuestionException;
import com.likelion.answerfit.question.repository.QuestionReportRepository;
import com.likelion.answerfit.question.repository.QuestionRepository;
import com.likelion.answerfit.user.entity.Role;

class QuestionReportServiceTest {

    private static final Long QUESTION_ID = 42L;
    private static final Long REPORT_ID = 88L;
    private static final long MEMBER_ID = 7L;
    private static final String CONTENT = "프로세스와 스레드의 차이를 설명해 주세요.";
    private static final String DETAIL = "신고 상세 사유입니다.";
    private static final QuestionMember MEMBER = new QuestionMember(MEMBER_ID, Role.USER);

    private QuestionRepository questionRepository;
    private QuestionReportRepository reportRepository;
    private QuestionReportService service;

    @BeforeEach
    void setUp() {
        questionRepository = mock(QuestionRepository.class);
        reportRepository = mock(QuestionReportRepository.class);
        service = new QuestionReportService(questionRepository, reportRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"WRONG_QUESTION", "WRONG_ANSWER", "DUPLICATE", "INAPPROPRIATE", "ETC"})
    void 다섯_사유를_구분하고_인증_회원의_정리된_상세를_승인대기_신고로_저장한다(String reasonType) {
        assertCreatesPendingReport(adminQuestion(QuestionMajor.CS),
                new CreateQuestionReportRequest(reasonType, "\uFEFF \u00A0" + DETAIL + " \n"), MEMBER, DETAIL);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("reportableQuestions")
    void 본인이_아닌_공개_질문은_분류와_출처와_회원_역할에_관계없이_신고한다(
            String scenario, Question question, QuestionMember member) {
        assertCreatesPendingReport(question, new CreateQuestionReportRequest("ETC", null), member, "");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "wrong_answer", "UNKNOWN", " WRONG_ANSWER"})
    void 허용되지_않은_사유는_질문이나_기존_신고를_조회하기_전에_거절한다(String reasonType) {
        assertThatThrownBy(() -> service.reportQuestion(
                QUESTION_ID, new CreateQuestionReportRequest(reasonType, DETAIL), MEMBER))
                .isInstanceOfSatisfying(QuestionException.class, exception -> {
                    assertThat(exception.getErrorCode()).isEqualTo(QuestionErrorCode.INVALID_REPORT_REASON);
                    assertThat(exception.getMessage()).isEqualTo(QuestionErrorCode.INVALID_REPORT_REASON.getMessage());
                });

        verifyNoInteractions(questionRepository, reportRepository);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("inaccessibleQuestions")
    void 비공개_질문과_본인_질문은_기존_신고를_읽거나_생성하기_전에_거절한다(
            String scenario, Optional<Question> question, QuestionMember member, QuestionErrorCode expected) {
        Optional<QuestionState> before = question.map(QuestionState::from);
        when(questionRepository.findForUpdateById(QUESTION_ID)).thenReturn(question);

        assertThatThrownBy(() -> service.reportQuestion(
                QUESTION_ID, new CreateQuestionReportRequest("ETC", DETAIL), member))
                .isInstanceOfSatisfying(QuestionException.class, exception -> {
                    assertThat(exception.getErrorCode()).isEqualTo(expected);
                    assertThat(exception.getMessage()).isEqualTo(expected.getMessage()).doesNotContain(CONTENT);
                });

        assertThat(question.map(QuestionState::from)).isEqualTo(before);
        verify(questionRepository).findForUpdateById(QUESTION_ID);
        verifyNoMoreInteractions(questionRepository);
        verifyNoInteractions(reportRepository);
    }

    @Test
    void 기존_신고가_있으면_이를_읽거나_덮어쓰지_않고_409를_반환한다() {
        Question question = approvedUserQuestion(2L);
        QuestionState before = QuestionState.from(question);
        when(questionRepository.findForUpdateById(QUESTION_ID)).thenReturn(Optional.of(question));
        when(reportRepository.existsByQuestionIdAndReporterId(QUESTION_ID, MEMBER_ID)).thenReturn(true);

        assertThatThrownBy(() -> service.reportQuestion(
                QUESTION_ID, new CreateQuestionReportRequest("WRONG_ANSWER", DETAIL), MEMBER))
                .isInstanceOfSatisfying(QuestionException.class, exception -> {
                    assertThat(exception.getErrorCode()).isEqualTo(QuestionErrorCode.ALREADY_REPORTED);
                    assertThat(exception.getMessage()).isEqualTo(QuestionErrorCode.ALREADY_REPORTED.getMessage());
                });

        assertThat(QuestionState.from(question)).isEqualTo(before);
        InOrder order = inOrder(questionRepository, reportRepository);
        order.verify(questionRepository).findForUpdateById(QUESTION_ID);
        order.verify(reportRepository).existsByQuestionIdAndReporterId(QUESTION_ID, MEMBER_ID);
        verifyNoMoreInteractions(questionRepository, reportRepository);
    }

    @Test
    void DB_무결성_실패는_서비스에서_다른_업무_오류로_숨기거나_재시도하지_않는다() {
        Question question = approvedUserQuestion(2L);
        QuestionState before = QuestionState.from(question);
        DataIntegrityViolationException failure = new DataIntegrityViolationException("private-constraint-detail");
        when(questionRepository.findForUpdateById(QUESTION_ID)).thenReturn(Optional.of(question));
        when(reportRepository.existsByQuestionIdAndReporterId(QUESTION_ID, MEMBER_ID)).thenReturn(false);
        when(reportRepository.saveAndFlush(any(QuestionReport.class))).thenThrow(failure);

        assertThatThrownBy(() -> service.reportQuestion(
                QUESTION_ID, new CreateQuestionReportRequest("ETC", DETAIL), MEMBER)).isSameAs(failure);

        assertThat(QuestionState.from(question)).isEqualTo(before);
        verify(questionRepository).findForUpdateById(QUESTION_ID);
        verify(reportRepository).existsByQuestionIdAndReporterId(QUESTION_ID, MEMBER_ID);
        verify(reportRepository).saveAndFlush(any(QuestionReport.class));
        verifyNoMoreInteractions(questionRepository, reportRepository);
    }

    private void assertCreatesPendingReport(
            Question question, CreateQuestionReportRequest request, QuestionMember member, String expectedDetail) {
        QuestionState before = QuestionState.from(question);
        when(questionRepository.findForUpdateById(QUESTION_ID)).thenReturn(Optional.of(question));
        when(reportRepository.existsByQuestionIdAndReporterId(QUESTION_ID, member.userId())).thenReturn(false);
        when(reportRepository.saveAndFlush(any(QuestionReport.class))).thenAnswer(invocation -> {
            QuestionReport saved = spy((QuestionReport) invocation.getArgument(0));
            doReturn(REPORT_ID).when(saved).getId();
            return saved;
        });

        var response = service.reportQuestion(QUESTION_ID, request, member);

        assertThat(response.id()).isEqualTo(REPORT_ID.toString());
        assertThat(response.status()).isEqualTo(ReportStatus.PENDING);
        assertThat(QuestionState.from(question)).isEqualTo(before);
        ArgumentCaptor<QuestionReport> captured = ArgumentCaptor.forClass(QuestionReport.class);
        InOrder order = inOrder(questionRepository, reportRepository);
        order.verify(questionRepository).findForUpdateById(QUESTION_ID);
        order.verify(reportRepository).existsByQuestionIdAndReporterId(QUESTION_ID, member.userId());
        order.verify(reportRepository).saveAndFlush(captured.capture());
        QuestionReport report = captured.getValue();
        assertThat(report.getQuestion()).isSameAs(question);
        assertThat(report.getReporterId()).isEqualTo(member.userId());
        assertThat(report.getReasonType()).isEqualTo(ReportReasonType.valueOf(request.reasonType()));
        assertThat(report.getReason()).isEqualTo(expectedDetail);
        assertThat(report.getStatus()).isEqualTo(ReportStatus.PENDING);
        assertThat(report.getModeration()).isNull();
        assertThat(report.getHandledBy()).isNull();
        assertThat(report.getHandledAt()).isNull();
        verifyNoMoreInteractions(questionRepository, reportRepository);
    }

    private static Stream<Arguments> reportableQuestions() {
        return Stream.of(Role.values()).flatMap(role -> {
            Question failed = approvedUserQuestion(2L);
            failed.failModelAnswer();
            QuestionMember member = new QuestionMember(MEMBER_ID, role);
            return Stream.of(
                    Arguments.of("타인 USER 답안 생성 실패: " + role, failed, member),
                    Arguments.of("ADMIN 출처 CS: " + role, adminQuestion(QuestionMajor.CS), member),
                    Arguments.of("ADMIN 출처 중분류 없는 인성: " + role, adminQuestion(QuestionMajor.PERSONALITY), member));
        });
    }

    private static Stream<Arguments> inaccessibleQuestions() {
        Question ownPending = userQuestion(MEMBER_ID);
        Question ownRejected = userQuestion(MEMBER_ID);
        ownRejected.reject(99L);
        Question otherPending = userQuestion(2L);
        Question hidden = approvedUserQuestion(MEMBER_ID);
        hidden.hide();
        Question deleted = approvedUserQuestion(MEMBER_ID);
        deleted.deleteByAdmin();
        Question ownApproved = approvedUserQuestion(MEMBER_ID);
        return Stream.of(
                Arguments.of("본인 PENDING도 비공개 404", Optional.of(ownPending), MEMBER, QuestionErrorCode.QUESTION_NOT_FOUND),
                Arguments.of("본인 REJECTED도 비공개 404", Optional.of(ownRejected), MEMBER, QuestionErrorCode.QUESTION_NOT_FOUND),
                Arguments.of("관리자도 타인 비공개 조회 불가", Optional.of(otherPending),
                        new QuestionMember(MEMBER_ID, Role.ADMIN), QuestionErrorCode.QUESTION_NOT_FOUND),
                Arguments.of("HIDDEN", Optional.of(hidden), MEMBER, QuestionErrorCode.QUESTION_NOT_FOUND),
                Arguments.of("삭제된 APPROVED", Optional.of(deleted), MEMBER, QuestionErrorCode.QUESTION_NOT_FOUND),
                Arguments.of("존재하지 않는 질문", Optional.empty(), MEMBER, QuestionErrorCode.QUESTION_NOT_FOUND),
                Arguments.of("본인 공개 질문", Optional.of(ownApproved), MEMBER, QuestionErrorCode.SELF_REPORT_NOT_ALLOWED),
                Arguments.of("관리자도 본인 USER 공개 질문 신고 불가", Optional.of(ownApproved),
                        new QuestionMember(MEMBER_ID, Role.ADMIN), QuestionErrorCode.SELF_REPORT_NOT_ALLOWED));
    }

    private static Question adminQuestion(QuestionMajor major) {
        return persisted(Question.createByAdmin(major, major == QuestionMajor.CS ? category() : null,
                CONTENT, null, null, MEMBER_ID));
    }

    private static Question approvedUserQuestion(Long authorId) {
        Question question = userQuestion(authorId);
        question.approve(99L);
        return persisted(question);
    }

    private static Question userQuestion(Long authorId) {
        return Question.createByUser(QuestionMajor.CS, category(), CONTENT, authorId);
    }

    private static Question persisted(Question question) {
        Question persisted = spy(question);
        doReturn(QUESTION_ID).when(persisted).getId();
        return persisted;
    }

    private static Category category() {
        return Category.builder().major(QuestionMajor.CS).name("운영체제").build();
    }

    private record QuestionState(QuestionStatus status, Instant deletedAt, String content, QuestionSource source,
                                 Long authorId, ModelAnswerStatus modelAnswerStatus) {

        static QuestionState from(Question question) {
            return new QuestionState(question.getStatus(), question.getDeletedAt(), question.getContent(),
                    question.getSource(), question.getAuthorId(), question.getModelAnswerStatus());
        }
    }
}
