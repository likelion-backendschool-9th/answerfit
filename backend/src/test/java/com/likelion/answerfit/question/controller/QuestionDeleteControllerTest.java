package com.likelion.answerfit.question.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
import com.likelion.answerfit.question.exception.QuestionErrorCode;
import com.likelion.answerfit.question.exception.QuestionException;
import com.likelion.answerfit.question.exception.QuestionExceptionHandler;
import com.likelion.answerfit.question.service.QuestionCommandService;
import com.likelion.answerfit.user.entity.Role;
import com.likelion.answerfit.user.entity.UserStatus;

class QuestionDeleteControllerTest {

    private static final String PATH = "/api/v1/learning/questions/{questionId}";

    private QuestionCommandService service;
    private MockMvc mockMvc;
    private LocalValidatorFactoryBean validator;

    @BeforeEach
    void setUp() {
        service = mock(QuestionCommandService.class);
        validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mockMvc = MockMvcBuilders.standaloneSetup(new QuestionCommandController(service))
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
    void 정상_회원과_관리자는_인증된_신원으로_삭제하고_빈_204를_받는다(Role role) throws Exception {
        QuestionMember member = new QuestionMember(7L, role);

        mockMvc.perform(delete(PATH, Long.MAX_VALUE)
                        .principal(new VerifiedPrincipal(7L, role, UserStatus.ACTIVE, null))
                        .header("X-User-Id", "999").param("userId", "999"))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""))
                .andExpect(header().doesNotExist(HttpHeaders.LOCATION));

        verify(service).deleteQuestion(Long.MAX_VALUE, member);
        verifyNoMoreInteractions(service);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("unverifiedRequests")
    void 검증된_principal이_없으면_삭제_서비스를_호출하지_않는다(
            String scenario, MockHttpServletRequestBuilder request) throws Exception {
        mockMvc.perform(request)
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"))
                .andExpect(jsonPath("$.message").value("로그인이 필요합니다."));

        verifyNoInteractions(service);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("inaccessibleAccounts")
    void 이용정지와_탈퇴_회원은_삭제_전에_거절한다(
            String scenario, VerifiedPrincipal principal, int httpStatus, String code, String message) throws Exception {
        mockMvc.perform(delete(PATH, 42).principal(principal))
                .andExpect(status().is(httpStatus))
                .andExpect(jsonPath("$.code").value(code))
                .andExpect(jsonPath("$.message").value(message));

        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "not-a-number", "9223372036854775808"})
    void 양수가_아니거나_Long으로_변환할_수_없는_ID는_400이다(String id) throws Exception {
        mockMvc.perform(authenticatedRequest(id))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));

        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @EnumSource(value = QuestionErrorCode.class, names = {
            "QUESTION_NOT_FOUND", "ACCESS_DENIED", "QUESTION_NOT_EDITABLE"})
    void 삭제_업무_오류는_공통_상태와_응답을_반환한다(QuestionErrorCode code) throws Exception {
        QuestionMember member = new QuestionMember(7L, Role.USER);
        doThrow(new QuestionException(code)).when(service).deleteQuestion(42L, member);

        mockMvc.perform(authenticatedRequest("42"))
                .andExpect(status().is(code.getStatus().value()))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value(code.name()))
                .andExpect(jsonPath("$.message").value(code.getMessage()));

        verify(service).deleteQuestion(42L, member);
        verifyNoMoreInteractions(service);
    }

    @Test
    void 잠금_획득_실패는_내부_메시지_없이_409를_반환한다() throws Exception {
        QuestionMember member = new QuestionMember(7L, Role.USER);
        doThrow(new CannotAcquireLockException("private-lock-details")).when(service).deleteQuestion(42L, member);

        mockMvc.perform(authenticatedRequest("42"))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value("QUESTION_STATE_CHANGED"))
                .andExpect(jsonPath("$.message").value("질문의 상태가 변경되었습니다. 다시 확인해 주세요."))
                .andExpect(content().string(not(containsString("private-lock-details"))));

        verify(service).deleteQuestion(42L, member);
        verifyNoMoreInteractions(service);
    }

    private static Stream<Arguments> unverifiedRequests() {
        return Stream.of(
                Arguments.of("인증 정보 없음", delete(PATH, 42)),
                Arguments.of("회원 ID를 이름으로만 제공한 principal", delete(PATH, 42).principal(() -> "7")),
                Arguments.of("임의 회원 ID 헤더와 쿼리", delete(PATH, 42).header("X-User-Id", "7").param("userId", "7")),
                Arguments.of("검증되지 않은 Bearer 헤더", delete(PATH, 42).header("Authorization", "Bearer invalid-token")));
    }

    private static Stream<Arguments> inaccessibleAccounts() {
        return Stream.of(
                Arguments.of("이용정지", new VerifiedPrincipal(7L, Role.USER, UserStatus.SUSPENDED, null),
                        403, "ACCESS_DENIED", "이 요청을 처리할 권한이 없습니다."),
                Arguments.of("탈퇴", new VerifiedPrincipal(7L, Role.USER, UserStatus.ACTIVE,
                        Instant.parse("2026-11-26T01:02:03Z")),
                        401, "UNAUTHENTICATED", "로그인이 필요합니다."));
    }

    private static MockHttpServletRequestBuilder authenticatedRequest(String id) {
        return delete(PATH, id).principal(new VerifiedPrincipal(7L, Role.USER, UserStatus.ACTIVE, null));
    }

    private record VerifiedPrincipal(Long userId, Role role, UserStatus status, Instant deletedAt)
            implements QuestionPrincipal {
    }
}
