package com.likelion.answerfit.question.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
import com.likelion.answerfit.question.dto.request.UpdateQuestionRequest;
import com.likelion.answerfit.question.dto.response.QuestionUpdateResponse;
import com.likelion.answerfit.question.entity.QuestionStatus;
import com.likelion.answerfit.question.exception.QuestionErrorCode;
import com.likelion.answerfit.question.exception.QuestionException;
import com.likelion.answerfit.question.exception.QuestionExceptionHandler;
import com.likelion.answerfit.question.service.QuestionCommandService;
import com.likelion.answerfit.user.entity.Role;
import com.likelion.answerfit.user.entity.UserStatus;

class QuestionUpdateControllerTest {

    private static final String PATH = "/api/v1/learning/questions/{questionId}";
    private static final String QUESTION = "프로세스와 스레드의 차이는?";
    private static final long QUESTION_ID = Long.MAX_VALUE;

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
    void 정상_회원과_관리자의_수정_요청은_인증된_회원과_정규화된_본문을_전달한다(Role role) throws Exception {
        UpdateQuestionRequest body = new UpdateQuestionRequest(2L, QUESTION);
        QuestionMember member = new QuestionMember(7L, role);
        when(service.updateQuestion(QUESTION_ID, body, member)).thenReturn(updatedResponse(QUESTION_ID));

        mockMvc.perform(request(Long.toString(QUESTION_ID))
                        .content("{\"categoryId\":2,\"content\":\" \u00A0" + QUESTION + " \uFEFF \"}")
                        .principal(new VerifiedPrincipal(7L, role, UserStatus.ACTIVE, null))
                        .header("X-User-Id", "999").param("userId", "999"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(header().doesNotExist(HttpHeaders.LOCATION))
                .andExpect(jsonPath("$.id").isString())
                .andExpect(jsonPath("$.id").value(Long.toString(QUESTION_ID)))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.canEdit").value(true))
                .andExpect(jsonPath("$.canDelete").value(true))
                .andExpect(jsonPath("$.authorId").doesNotExist());

        verify(service).updateQuestion(QUESTION_ID, body, member);
        verifyNoMoreInteractions(service);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("validPatches")
    void 부분_수정과_코드포인트_경계를_허용한다(
            String scenario, String json, UpdateQuestionRequest expected) throws Exception {
        QuestionMember member = new QuestionMember(7L, Role.USER);
        when(service.updateQuestion(42L, expected, member)).thenReturn(updatedResponse(42L));

        mockMvc.perform(authenticatedRequest("42").content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("42"))
                .andExpect(jsonPath("$.status").value("PENDING"));

        verify(service).updateQuestion(42L, expected, member);
        verifyNoMoreInteractions(service);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidBodies")
    void 비어_있거나_유효하지_않은_본문은_서비스_호출_전에_거절한다(String scenario, String json) throws Exception {
        mockMvc.perform(authenticatedRequest("42").content(json))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.message").value("입력값을 확인해 주세요."));

        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "not-a-number", "9223372036854775808"})
    void 양수가_아니거나_Long으로_변환할_수_없는_ID는_400이다(String id) throws Exception {
        mockMvc.perform(authenticatedRequest(id))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));

        verifyNoInteractions(service);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("unverifiedRequests")
    void 검증된_principal이_없으면_수정_서비스를_호출하지_않는다(
            String scenario, MockHttpServletRequestBuilder request) throws Exception {
        mockMvc.perform(request)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"))
                .andExpect(jsonPath("$.message").value("로그인이 필요합니다."));

        verifyNoInteractions(service);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("inaccessibleAccounts")
    void 이용정지와_탈퇴_회원은_수정_전에_거절한다(
            String scenario, VerifiedPrincipal principal, int httpStatus, String code, String message) throws Exception {
        mockMvc.perform(request("42").principal(principal))
                .andExpect(status().is(httpStatus))
                .andExpect(jsonPath("$.code").value(code))
                .andExpect(jsonPath("$.message").value(message));

        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @EnumSource(value = QuestionErrorCode.class, names = {
            "QUESTION_NOT_FOUND", "ACCESS_DENIED", "QUESTION_NOT_EDITABLE", "INVALID_CATEGORY"})
    void 수정_업무_오류는_공통_상태와_응답으로_반환한다(QuestionErrorCode code) throws Exception {
        UpdateQuestionRequest body = new UpdateQuestionRequest(null, QUESTION);
        QuestionMember member = new QuestionMember(7L, Role.USER);
        when(service.updateQuestion(42L, body, member)).thenThrow(new QuestionException(code));

        mockMvc.perform(authenticatedRequest("42"))
                .andExpect(status().is(code.getStatus().value()))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value(code.name()))
                .andExpect(jsonPath("$.message").value(code.getMessage()));

        verify(service).updateQuestion(42L, body, member);
        verifyNoMoreInteractions(service);
    }

    @Test
    void 잠금_획득_실패는_내부_메시지_없이_상태_변경_409로_반환한다() throws Exception {
        UpdateQuestionRequest body = new UpdateQuestionRequest(null, QUESTION);
        QuestionMember member = new QuestionMember(7L, Role.USER);
        when(service.updateQuestion(42L, body, member))
                .thenThrow(new CannotAcquireLockException("private-lock-details"));

        mockMvc.perform(authenticatedRequest("42"))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value("QUESTION_STATE_CHANGED"))
                .andExpect(jsonPath("$.message").value("질문의 상태가 변경되었습니다. 다시 확인해 주세요."))
                .andExpect(content().string(not(containsString("private-lock-details"))));

        verify(service).updateQuestion(42L, body, member);
        verifyNoMoreInteractions(service);
    }

    private static Stream<Arguments> validPatches() {
        return Stream.of(
                Arguments.of("내용만 수정", contentBody(QUESTION), new UpdateQuestionRequest(null, QUESTION)),
                Arguments.of("카테고리만 수정", "{\"categoryId\":2}", new UpdateQuestionRequest(2L, null)),
                Arguments.of("카테고리 null은 미전달", "{\"categoryId\":null,\"content\":\"" + QUESTION + "\"}",
                        new UpdateQuestionRequest(null, QUESTION)),
                Arguments.of("내용 null은 미전달", "{\"categoryId\":2,\"content\":null}",
                        new UpdateQuestionRequest(2L, null)),
                Arguments.of("최소 10자", contentBody("가".repeat(10)), new UpdateQuestionRequest(null, "가".repeat(10))),
                Arguments.of("최대 200자", contentBody("가".repeat(200)), new UpdateQuestionRequest(null, "가".repeat(200))),
                Arguments.of("이모지 200 코드포인트", contentBody("😀".repeat(200)),
                        new UpdateQuestionRequest(null, "😀".repeat(200))));
    }

    private static Stream<Arguments> invalidBodies() {
        return Stream.of(
                Arguments.of("빈 객체", "{}"),
                Arguments.of("두 필드가 모두 null", "{\"categoryId\":null,\"content\":null}"),
                Arguments.of("알 수 없는 필드만 전달", "{\"status\":\"APPROVED\"}"),
                Arguments.of("카테고리 0", "{\"categoryId\":0}"),
                Arguments.of("카테고리 음수", "{\"categoryId\":-1}"),
                Arguments.of("내용 null만 전달", "{\"content\":null}"),
                Arguments.of("빈 질문", contentBody("")),
                Arguments.of("유니코드 공백 질문", contentBody(" \u00A0\uFEFF ")),
                Arguments.of("최소 길이 미만", contentBody("가".repeat(9))),
                Arguments.of("최대 길이 초과", contentBody("가".repeat(201))),
                Arguments.of("이모지 최대 길이 초과", contentBody("😀".repeat(201))),
                Arguments.of("카테고리 타입 오류", "{\"categoryId\":\"not-an-id\"}"),
                Arguments.of("질문 타입 오류", "{\"content\":{}}"),
                Arguments.of("객체가 아닌 본문", "42"),
                Arguments.of("깨진 JSON", "{\"content\":"),
                Arguments.of("본문 없음", ""));
    }

    private static Stream<Arguments> unverifiedRequests() {
        return Stream.of(
                Arguments.of("인증 정보 없음", request("42")),
                Arguments.of("회원 ID를 이름으로만 제공한 principal", request("42").principal(() -> "7")),
                Arguments.of("임의 회원 ID 헤더", request("42").header("X-User-Id", "7")),
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

    private static QuestionUpdateResponse updatedResponse(long id) {
        return new QuestionUpdateResponse(Long.toString(id), QuestionStatus.PENDING, true, true);
    }

    private static MockHttpServletRequestBuilder request(String id) {
        return patch(PATH, id).contentType(MediaType.APPLICATION_JSON).content(contentBody(QUESTION));
    }

    private static MockHttpServletRequestBuilder authenticatedRequest(String id) {
        return request(id).principal(new VerifiedPrincipal(7L, Role.USER, UserStatus.ACTIVE, null));
    }

    private static String contentBody(String question) {
        return "{\"content\":\"" + question + "\"}";
    }

    private record VerifiedPrincipal(Long userId, Role role, UserStatus status, Instant deletedAt)
            implements QuestionPrincipal {
    }
}
