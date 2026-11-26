package com.likelion.answerfit.question.controller;

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
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import com.likelion.answerfit.question.auth.QuestionMember;
import com.likelion.answerfit.question.auth.QuestionPrincipal;
import com.likelion.answerfit.question.dto.request.CreateQuestionRequest;
import com.likelion.answerfit.question.dto.response.QuestionCreateResponse;
import com.likelion.answerfit.question.entity.QuestionStatus;
import com.likelion.answerfit.question.exception.QuestionErrorCode;
import com.likelion.answerfit.question.exception.QuestionException;
import com.likelion.answerfit.question.exception.QuestionExceptionHandler;
import com.likelion.answerfit.question.service.QuestionCommandService;
import com.likelion.answerfit.user.entity.Role;
import com.likelion.answerfit.user.entity.UserStatus;

class QuestionCreateControllerTest {

    private static final String PATH = "/api/v1/learning/questions";
    private static final String CREATED_ID = Long.toString(Long.MAX_VALUE);
    private static final String QUESTION = "프로세스와 스레드의 차이는?";

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
    void 정상_회원과_관리자는_정규화된_질문을_본인_신원으로_등록한다(Role role) throws Exception {
        CreateQuestionRequest body = new CreateQuestionRequest(1L, QUESTION);
        QuestionMember member = new QuestionMember(7L, role);
        when(service.createQuestion(body, member))
                .thenReturn(new QuestionCreateResponse(CREATED_ID, QuestionStatus.PENDING));

        mockMvc.perform(request().content(questionBody(" \u00A0" + QUESTION + " \uFEFF "))
                        .principal(new VerifiedPrincipal(7L, role, UserStatus.ACTIVE, null))
                        .header("X-User-Id", "999").param("userId", "999"))
                .andExpect(status().isCreated())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(header().string(HttpHeaders.LOCATION, PATH + "/" + CREATED_ID))
                .andExpect(jsonPath("$.id").isString())
                .andExpect(jsonPath("$.id").value(CREATED_ID))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.authorId").doesNotExist());

        verify(service).createQuestion(body, member);
        verifyNoMoreInteractions(service);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("validContentBoundaries")
    void 최소_최대_코드포인트_길이의_질문을_허용한다(String scenario, String question) throws Exception {
        CreateQuestionRequest body = new CreateQuestionRequest(1L, question);
        QuestionMember member = new QuestionMember(7L, Role.USER);
        when(service.createQuestion(body, member))
                .thenReturn(new QuestionCreateResponse(CREATED_ID, QuestionStatus.PENDING));

        mockMvc.perform(authenticatedRequest().content(questionBody(question)))
                .andExpect(status().isCreated())
                .andExpect(header().string(HttpHeaders.LOCATION, PATH + "/" + CREATED_ID))
                .andExpect(jsonPath("$.id").value(CREATED_ID))
                .andExpect(jsonPath("$.status").value("PENDING"));

        verify(service).createQuestion(body, member);
        verifyNoMoreInteractions(service);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidBodies")
    void 잘못된_본문은_400으로_거절하고_서비스를_호출하지_않는다(String scenario, String body) throws Exception {
        mockMvc.perform(authenticatedRequest().content(body))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.message").value("입력값을 확인해 주세요."));

        verifyNoInteractions(service);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("unverifiedRequests")
    void 검증된_principal이_없으면_등록_서비스를_호출하지_않는다(
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
    void 이용정지와_탈퇴_회원은_등록_전에_거절한다(
            String scenario, VerifiedPrincipal principal, int httpStatus, String code, String message) throws Exception {
        mockMvc.perform(request().principal(principal))
                .andExpect(status().is(httpStatus))
                .andExpect(jsonPath("$.code").value(code))
                .andExpect(jsonPath("$.message").value(message));

        verifyNoInteractions(service);
    }

    @Test
    void 존재하지_않거나_CS가_아닌_카테고리의_업무_오류를_반환한다() throws Exception {
        CreateQuestionRequest body = new CreateQuestionRequest(1L, QUESTION);
        QuestionMember member = new QuestionMember(7L, Role.USER);
        when(service.createQuestion(body, member))
                .thenThrow(new QuestionException(QuestionErrorCode.INVALID_CATEGORY));

        mockMvc.perform(authenticatedRequest())
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value("INVALID_CATEGORY"))
                .andExpect(jsonPath("$.message").value("올바른 카테고리를 선택해 주세요."));

        verify(service).createQuestion(body, member);
        verifyNoMoreInteractions(service);
    }

    private static Stream<Arguments> validContentBoundaries() {
        return Stream.of(
                Arguments.of("최소 10자", "가".repeat(10)),
                Arguments.of("최대 200자", "가".repeat(200)),
                Arguments.of("이모지 200 코드포인트", "😀".repeat(200)));
    }

    private static Stream<Arguments> invalidBodies() {
        return Stream.of(
                Arguments.of("카테고리 누락", "{\"content\":\"" + QUESTION + "\"}"),
                Arguments.of("카테고리 null", "{\"categoryId\":null,\"content\":\"" + QUESTION + "\"}"),
                Arguments.of("카테고리 0", "{\"categoryId\":0,\"content\":\"" + QUESTION + "\"}"),
                Arguments.of("카테고리 음수", "{\"categoryId\":-1,\"content\":\"" + QUESTION + "\"}"),
                Arguments.of("카테고리 타입 오류", "{\"categoryId\":\"not-an-id\",\"content\":\"" + QUESTION + "\"}"),
                Arguments.of("질문 null", "{\"categoryId\":1,\"content\":null}"),
                Arguments.of("빈 질문", questionBody("")),
                Arguments.of("유니코드 공백만 있는 질문", questionBody(" \u00A0\uFEFF ")),
                Arguments.of("최소 길이 미만", questionBody("가".repeat(9))),
                Arguments.of("최대 길이 초과", questionBody("가".repeat(201))),
                Arguments.of("이모지 최대 길이 초과", questionBody("😀".repeat(201))),
                Arguments.of("질문 타입 오류", "{\"categoryId\":1,\"content\":{}}"),
                Arguments.of("깨진 JSON", "{\"categoryId\":1,\"content\":"),
                Arguments.of("본문 없음", ""));
    }

    private static Stream<Arguments> unverifiedRequests() {
        return Stream.of(
                Arguments.of("인증 정보 없음", request()),
                Arguments.of("회원 ID를 이름으로만 제공한 principal", request().principal(() -> "7")),
                Arguments.of("임의 회원 ID 헤더", request().header("X-User-Id", "7")),
                Arguments.of("검증되지 않은 Bearer 헤더", request().header("Authorization", "Bearer invalid-token")));
    }

    private static Stream<Arguments> inaccessibleAccounts() {
        return Stream.of(
                Arguments.of("이용정지", new VerifiedPrincipal(7L, Role.USER, UserStatus.SUSPENDED, null),
                        403, "ACCESS_DENIED", "이 요청을 처리할 권한이 없습니다."),
                Arguments.of("탈퇴", new VerifiedPrincipal(7L, Role.USER, UserStatus.ACTIVE,
                        Instant.parse("2026-11-26T01:02:03Z")),
                        401, "UNAUTHENTICATED", "로그인이 필요합니다."));
    }

    private static MockHttpServletRequestBuilder request() {
        return post(PATH).contentType(MediaType.APPLICATION_JSON).content(questionBody(QUESTION));
    }

    private static MockHttpServletRequestBuilder authenticatedRequest() {
        return request().principal(new VerifiedPrincipal(7L, Role.USER, UserStatus.ACTIVE, null));
    }

    private static String questionBody(String question) {
        return "{\"categoryId\":1,\"content\":\"" + question + "\"}";
    }

    private record VerifiedPrincipal(Long userId, Role role, UserStatus status, Instant deletedAt)
            implements QuestionPrincipal {
    }
}
