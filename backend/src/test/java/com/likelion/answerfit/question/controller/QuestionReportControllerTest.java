package com.likelion.answerfit.question.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.stream.Stream;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import com.likelion.answerfit.question.auth.QuestionMember;
import com.likelion.answerfit.question.auth.QuestionPrincipal;
import com.likelion.answerfit.question.dto.request.CreateQuestionReportRequest;
import com.likelion.answerfit.question.dto.response.QuestionReportResponse;
import com.likelion.answerfit.question.entity.ReportStatus;
import com.likelion.answerfit.question.exception.QuestionErrorCode;
import com.likelion.answerfit.question.exception.QuestionException;
import com.likelion.answerfit.question.exception.QuestionExceptionHandler;
import com.likelion.answerfit.question.service.QuestionReportService;
import com.likelion.answerfit.user.entity.Role;
import com.likelion.answerfit.user.entity.UserStatus;

class QuestionReportControllerTest {

    private static final String PATH = "/api/v1/learning/questions/{questionId}/reports";
    private static final String REASON = "WRONG_QUESTION";
    private static final String DETAIL = "질문의 기준이 불명확합니다.";
    private static final String REPORT_ID = "9007199254740993";

    private QuestionReportService service;
    private MockMvc mockMvc;
    private LocalValidatorFactoryBean validator;

    @BeforeEach
    void setUp() {
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

    @ParameterizedTest
    @EnumSource(Role.class)
    void 정상_회원과_관리자는_정규화된_신고를_인증된_신원으로_등록한다(Role role) throws Exception {
        CreateQuestionReportRequest body = new CreateQuestionReportRequest(REASON, DETAIL);
        QuestionMember member = new QuestionMember(7L, role);
        when(service.reportQuestion(Long.MAX_VALUE, body, member)).thenReturn(createdResponse());

        mockMvc.perform(request(Long.toString(Long.MAX_VALUE))
                        .content(reportBody(REASON, " \u00A0" + DETAIL + " \uFEFF "))
                        .principal(new VerifiedPrincipal(7L, role, UserStatus.ACTIVE, null))
                        .header("X-User-Id", "999").param("userId", "999"))
                .andExpect(status().isCreated())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(header().doesNotExist(HttpHeaders.LOCATION))
                .andExpect(jsonPath("$.id").isString())
                .andExpect(jsonPath("$.id").value(REPORT_ID))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.reporterId").doesNotExist());

        verify(service).reportQuestion(Long.MAX_VALUE, body, member);
        verifyNoMoreInteractions(service);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("validDetails")
    void 상세_사유의_생략_null_공백과_300_코드포인트를_허용한다(
            String scenario, String json, String expectedDetail) throws Exception {
        CreateQuestionReportRequest body = new CreateQuestionReportRequest(REASON, expectedDetail);
        QuestionMember member = new QuestionMember(7L, Role.USER);
        when(service.reportQuestion(42L, body, member)).thenReturn(createdResponse());

        mockMvc.perform(authenticatedRequest("42").content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(REPORT_ID))
                .andExpect(jsonPath("$.status").value("PENDING"));

        verify(service).reportQuestion(42L, body, member);
        verifyNoMoreInteractions(service);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidBodies")
    void 유효하지_않은_본문과_301_코드포인트_상세는_서비스_전에_거절한다(String scenario, String json) throws Exception {
        mockMvc.perform(authenticatedRequest("42").content(json))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.message").value("입력값을 확인해 주세요."));

        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "not-a-number", "9223372036854775808"})
    void 양수가_아니거나_Long으로_변환할_수_없는_질문_ID는_400이다(String id) throws Exception {
        mockMvc.perform(authenticatedRequest(id))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));

        verifyNoInteractions(service);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("unverifiedRequests")
    void 검증된_principal이_없으면_신고_서비스를_호출하지_않는다(
            String scenario, MockHttpServletRequestBuilder request) throws Exception {
        mockMvc.perform(request)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"))
                .andExpect(jsonPath("$.message").value("로그인이 필요합니다."));

        verifyNoInteractions(service);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("inaccessibleAccounts")
    void 이용정지와_탈퇴_회원은_신고_전에_거절한다(
            String scenario, VerifiedPrincipal principal, int httpStatus, String code, String message) throws Exception {
        mockMvc.perform(request("42").principal(principal))
                .andExpect(status().is(httpStatus))
                .andExpect(jsonPath("$.code").value(code))
                .andExpect(jsonPath("$.message").value(message));

        verifyNoInteractions(service);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("businessErrors")
    void 신고_유형과_권한_대상_중복_오류를_공통_응답으로_반환한다(
            String scenario, String json, CreateQuestionReportRequest body, QuestionErrorCode code) throws Exception {
        QuestionMember member = new QuestionMember(7L, Role.USER);
        when(service.reportQuestion(42L, body, member)).thenThrow(new QuestionException(code));

        mockMvc.perform(authenticatedRequest("42").content(json))
                .andExpect(status().is(code.getStatus().value()))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value(code.name()))
                .andExpect(jsonPath("$.message").value(code.getMessage()));

        verify(service).reportQuestion(42L, body, member);
        verifyNoMoreInteractions(service);
    }

    @Test
    void 잠금_획득_실패는_내부_메시지_없이_409를_반환한다() throws Exception {
        CreateQuestionReportRequest body = new CreateQuestionReportRequest(REASON, DETAIL);
        QuestionMember member = new QuestionMember(7L, Role.USER);
        when(service.reportQuestion(42L, body, member))
                .thenThrow(new CannotAcquireLockException("private-lock-details"));

        mockMvc.perform(authenticatedRequest("42"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("QUESTION_STATE_CHANGED"))
                .andExpect(jsonPath("$.message").value("질문의 상태가 변경되었습니다. 다시 확인해 주세요."))
                .andExpect(content().string(not(containsString("private-lock-details"))));

        verify(service).reportQuestion(42L, body, member);
        verifyNoMoreInteractions(service);
    }

    private static Stream<Arguments> validDetails() {
        return Stream.of(
                Arguments.of("상세 누락", "{\"reasonType\":\"" + REASON + "\"}", ""),
                Arguments.of("상세 null", "{\"reasonType\":\"" + REASON + "\",\"detail\":null}", ""),
                Arguments.of("상세 공백", reportBody(REASON, " \u00A0\uFEFF "), ""),
                Arguments.of("이모지 300 코드포인트", reportBody(REASON, "😀".repeat(300)), "😀".repeat(300)));
    }

    private static Stream<Arguments> invalidBodies() {
        return Stream.of(
                Arguments.of("301자 상세", reportBody(REASON, "가".repeat(301))),
                Arguments.of("이모지 301 코드포인트", reportBody(REASON, "😀".repeat(301))),
                Arguments.of("상세 타입 오류", "{\"reasonType\":\"" + REASON + "\",\"detail\":{}}"),
                Arguments.of("유형 타입 오류", "{\"reasonType\":{},\"detail\":\"\"}"),
                Arguments.of("객체가 아닌 본문", "42"),
                Arguments.of("깨진 JSON", "{\"reasonType\":"),
                Arguments.of("본문 없음", ""));
    }

    private static Stream<Arguments> businessErrors() {
        CreateQuestionReportRequest valid = new CreateQuestionReportRequest(REASON, DETAIL);
        String validJson = reportBody(REASON, DETAIL);
        return Stream.of(
                Arguments.of("잘못된 신고 유형", reportBody("UNKNOWN", DETAIL),
                        new CreateQuestionReportRequest("UNKNOWN", DETAIL), QuestionErrorCode.INVALID_REPORT_REASON),
                Arguments.of("신고 유형 누락", "{}",
                        new CreateQuestionReportRequest(null, ""), QuestionErrorCode.INVALID_REPORT_REASON),
                Arguments.of("본인 질문 신고", validJson, valid, QuestionErrorCode.SELF_REPORT_NOT_ALLOWED),
                Arguments.of("조회 불가능한 질문", validJson, valid, QuestionErrorCode.QUESTION_NOT_FOUND),
                Arguments.of("중복 신고", validJson, valid, QuestionErrorCode.ALREADY_REPORTED));
    }

    private static Stream<Arguments> unverifiedRequests() {
        return Stream.of(
                Arguments.of("인증 정보 없음", request("42")),
                Arguments.of("회원 ID를 이름으로만 제공한 principal", request("42").principal(() -> "7")),
                Arguments.of("임의 회원 ID 헤더와 쿼리", request("42").header("X-User-Id", "7").param("userId", "7")),
                Arguments.of("검증되지 않은 Bearer 헤더", request("42").header("Authorization", "Bearer invalid-token")));
    }

    private static Stream<Arguments> inaccessibleAccounts() {
        return Stream.of(
                Arguments.of("이용정지", new VerifiedPrincipal(7L, Role.USER, UserStatus.SUSPENDED, null),
                        403, "ACCESS_DENIED", "이 요청을 처리할 권한이 없습니다."),
                Arguments.of("탈퇴", new VerifiedPrincipal(7L, Role.USER, UserStatus.ACTIVE,
                        Instant.parse("2026-11-26T01:02:03Z")),
                        401, "UNAUTHENTICATED", "로그인이 필요합니다."));
    }

    private static QuestionReportResponse createdResponse() {
        return new QuestionReportResponse(REPORT_ID, ReportStatus.PENDING);
    }

    private static MockHttpServletRequestBuilder request(String id) {
        return post(PATH, id).contentType(MediaType.APPLICATION_JSON).content(reportBody(REASON, DETAIL));
    }

    private static MockHttpServletRequestBuilder authenticatedRequest(String id) {
        return request(id).principal(new VerifiedPrincipal(7L, Role.USER, UserStatus.ACTIVE, null));
    }

    private static String reportBody(String reasonType, String detail) {
        return "{\"reasonType\":\"" + reasonType + "\",\"detail\":\"" + detail + "\"}";
    }

    private record VerifiedPrincipal(Long userId, Role role, UserStatus status, Instant deletedAt)
            implements QuestionPrincipal {
    }
}
