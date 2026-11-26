package com.likelion.answerfit.question.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.containsStringIgnoringCase;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.SQLException;
import java.time.Instant;

import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import com.likelion.answerfit.question.auth.QuestionMember;
import com.likelion.answerfit.question.auth.QuestionPrincipal;
import com.likelion.answerfit.question.controller.QuestionReportController;
import com.likelion.answerfit.question.dto.request.CreateQuestionReportRequest;
import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.Question;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.entity.QuestionReport;
import com.likelion.answerfit.question.entity.ReportReasonType;
import com.likelion.answerfit.question.exception.QuestionExceptionHandler;
import com.likelion.answerfit.question.service.QuestionReportService;
import com.likelion.answerfit.user.entity.Role;
import com.likelion.answerfit.user.entity.UserStatus;

@DataJpaTest
class QuestionReportConstraintTest {

    @Autowired
    private QuestionReportRepository reportRepository;

    @Autowired
    private TestEntityManager entityManager;

    private QuestionReportService service;
    private MockMvc mockMvc;
    private LocalValidatorFactoryBean validator;

    @BeforeEach
    void setUpHttpContract() {
        service = mock(QuestionReportService.class);
        validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mockMvc = MockMvcBuilders.standaloneSetup(new QuestionReportController(service))
                .setControllerAdvice(new QuestionExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @AfterEach
    void closeValidator() {
        validator.close();
    }

    @Test
    void 실제_H2_중복_신고_제약_예외를_동일한_HTTP_409로_변환한다() throws Exception {
        Category category = entityManager.persist(Category.builder()
                .major(QuestionMajor.CS).name("운영체제").build());
        Question question = entityManager.persistAndFlush(Question.createByAdmin(QuestionMajor.CS, category,
                "프로세스와 스레드의 차이는?", null, null, 99L));
        reportRepository.saveAndFlush(report(question, "첫 번째 신고"));

        DataIntegrityViolationException duplicate = assertThrows(DataIntegrityViolationException.class,
                () -> reportRepository.saveAndFlush(report(question, "private-report-details")));
        ConstraintViolationException hibernateFailure = constraintCause(duplicate);
        assertThat(hibernateFailure.getConstraintName())
                .containsIgnoringCase("uk_question_reports_question_reporter");

        mockServiceFailure(question.getId(), duplicate);

        mockMvc.perform(post("/api/v1/learning/questions/{id}/reports", question.getId())
                        .principal(new VerifiedPrincipal(7L, Role.USER, UserStatus.ACTIVE, null))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reasonType\":\"WRONG_QUESTION\",\"detail\":\"\"}"))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value("ALREADY_REPORTED"))
                .andExpect(jsonPath("$.message").value("이미 신고한 질문입니다."))
                .andExpect(jsonPath("$.fieldErrors").doesNotExist())
                .andExpect(content().string(not(containsStringIgnoringCase("uk_question_reports"))))
                .andExpect(content().string(not(containsStringIgnoringCase("insert into"))))
                .andExpect(content().string(not(containsString("private-report-details"))));

        verifyServiceFailure(question.getId());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"uk_other_constraint", "uk_question_reports_question_reporter_other"})
    void 다른_제약이나_이름_없는_제약은_메시지에_신고_제약명이_있어도_500이다(String constraintName) throws Exception {
        ConstraintViolationException hibernateFailure = new ConstraintViolationException(
                "private-hibernate-detail", new SQLException("private-jdbc-detail"), constraintName);
        DataIntegrityViolationException failure = new DataIntegrityViolationException(
                "private-wrapper-detail uk_question_reports_question_reporter", hibernateFailure);
        mockServiceFailure(42L, failure);

        mockMvc.perform(post("/api/v1/learning/questions/{id}/reports", 42)
                        .principal(new VerifiedPrincipal(7L, Role.USER, UserStatus.ACTIVE, null))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reasonType\":\"WRONG_QUESTION\",\"detail\":\"\"}"))
                .andExpect(status().isInternalServerError())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.message").value("요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요."))
                .andExpect(content().string(not(containsString("private-"))))
                .andExpect(content().string(not(containsStringIgnoringCase("uk_question_reports"))));

        verifyServiceFailure(42L);
    }

    private void mockServiceFailure(Long questionId, DataIntegrityViolationException failure) {
        when(service.reportQuestion(questionId, new CreateQuestionReportRequest("WRONG_QUESTION", ""),
                new QuestionMember(7L, Role.USER))).thenThrow(failure);
    }

    private void verifyServiceFailure(Long questionId) {
        verify(service).reportQuestion(questionId, new CreateQuestionReportRequest("WRONG_QUESTION", ""),
                new QuestionMember(7L, Role.USER));
        verifyNoMoreInteractions(service);
    }

    private static QuestionReport report(Question question, String detail) {
        return QuestionReport.builder().question(question).reporterId(7L)
                .reasonType(ReportReasonType.WRONG_QUESTION).reason(detail).build();
    }

    private static ConstraintViolationException constraintCause(Throwable failure) {
        for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException violation) {
                return violation;
            }
        }
        throw new AssertionError("Hibernate 제약 위반 원인을 찾을 수 없습니다.", failure);
    }

    private record VerifiedPrincipal(Long userId, Role role, UserStatus status, Instant deletedAt)
            implements QuestionPrincipal {
    }
}
