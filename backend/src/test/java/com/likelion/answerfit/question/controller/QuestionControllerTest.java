package com.likelion.answerfit.question.controller;

import static org.hamcrest.Matchers.emptyOrNullString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import com.likelion.answerfit.question.auth.QuestionMember;
import com.likelion.answerfit.question.auth.QuestionPrincipal;
import com.likelion.answerfit.question.dto.QuestionSort;
import com.likelion.answerfit.question.dto.request.QuestionSearchRequest;
import com.likelion.answerfit.question.dto.response.QuestionListResponse;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.entity.QuestionStatus;
import com.likelion.answerfit.question.exception.QuestionExceptionHandler;
import com.likelion.answerfit.question.service.QuestionQueryService;
import com.likelion.answerfit.user.entity.Role;
import com.likelion.answerfit.user.entity.UserStatus;

class QuestionControllerTest {

    private static final String PATH = "/api/v1/learning/questions";

    private QuestionQueryService service;
    private MockMvc mockMvc;
    private LocalValidatorFactoryBean validator;

    @BeforeEach
    void setUp() {
        service = mock(QuestionQueryService.class);
        validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mockMvc = MockMvcBuilders.standaloneSetup(new QuestionController(service))
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
    void 정상_회원과_관리자의_생략된_조회_조건에는_기본값을_적용한다(Role role) throws Exception {
        QuestionSearchRequest query = defaultQuery();
        QuestionMember member = new QuestionMember(7L, role);
        when(service.getQuestions(query, member)).thenReturn(emptyResponse());

        mockMvc.perform(get(PATH).principal(new VerifiedPrincipal(7L, role, UserStatus.ACTIVE, null)))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.items", hasSize(0)))
                .andExpect(jsonPath("$.totalCount").value(0))
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.pageSize").value(7))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.majorCounts.CS").value(0))
                .andExpect(jsonPath("$.majorCounts.PERSONALITY").value(0));

        verify(service).getQuestions(query, member);
        verifyNoMoreInteractions(service);
    }

    @Test
    void 기본값을_쿼리에_명시해도_동일하게_전달한다() throws Exception {
        QuestionSearchRequest query = defaultQuery();
        QuestionMember member = new QuestionMember(7L, Role.USER);
        when(service.getQuestions(query, member)).thenReturn(emptyResponse());

        mockMvc.perform(authenticatedRequest()
                        .param("major", "CS").param("keyword", "")
                        .param("likedOnly", "false").param("sort", "LATEST")
                        .param("page", "1").param("pageSize", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(0)));

        verify(service).getQuestions(query, member);
        verifyNoMoreInteractions(service);
    }

    @Test
    void 전체_조건과_인증_회원을_전달하고_목록_응답의_계약을_유지한다() throws Exception {
        QuestionSearchRequest query = new QuestionSearchRequest(
                QuestionMajor.PERSONALITY, 5L, "협업 \t갈등", true, QuestionSort.LIKES, 3, 20);
        QuestionMember member = new QuestionMember(17L, Role.ADMIN);
        when(service.getQuestions(query, member)).thenReturn(new QuestionListResponse(List.of(
                new QuestionListResponse.Item("9007199254740993", QuestionMajor.PERSONALITY,
                        new QuestionListResponse.CategoryItem("5", "협업"), "협업 중 갈등을 해결한 경험은?",
                        QuestionStatus.APPROVED, 4, true, false, true),
                new QuestionListResponse.Item("2", QuestionMajor.PERSONALITY,
                        new QuestionListResponse.CategoryItem("5", "협업"), "팀원과 갈등이 생겼을 때 대처법은?",
                        QuestionStatus.APPROVED, 7, true, true, false)),
                42, 3, 20, 3, Map.of(QuestionMajor.CS, 99L, QuestionMajor.PERSONALITY, 88L)));

        mockMvc.perform(get(PATH)
                        .principal(new VerifiedPrincipal(17L, Role.ADMIN, UserStatus.ACTIVE, null))
                        .header("X-User-Id", "999").param("userId", "999")
                        .param("major", "PERSONALITY").param("categoryId", "5")
                        .param("keyword", " \u00A0협업 \t갈등\uFEFF ")
                        .param("likedOnly", "true").param("sort", "LIKES")
                        .param("page", "3").param("pageSize", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.items[0].id").isString())
                .andExpect(jsonPath("$.items[0].id").value("9007199254740993"))
                .andExpect(jsonPath("$.items[0].major").value("PERSONALITY"))
                .andExpect(jsonPath("$.items[0].category.id").isString())
                .andExpect(jsonPath("$.items[0].category.id").value("5"))
                .andExpect(jsonPath("$.items[0].category.name").value("협업"))
                .andExpect(jsonPath("$.items[0].content").value("협업 중 갈등을 해결한 경험은?"))
                .andExpect(jsonPath("$.items[0].status").value("APPROVED"))
                .andExpect(jsonPath("$.items[0].likeCount").value(4))
                .andExpect(jsonPath("$.items[0].isLiked").value(true))
                .andExpect(jsonPath("$.items[0].isMine").value(false))
                .andExpect(jsonPath("$.items[0].isReported").value(true))
                .andExpect(jsonPath("$.items[1].isLiked").value(true))
                .andExpect(jsonPath("$.items[1].isMine").value(true))
                .andExpect(jsonPath("$.items[1].isReported").value(false))
                .andExpect(jsonPath("$.items[0].liked").doesNotExist())
                .andExpect(jsonPath("$.items[0].mine").doesNotExist())
                .andExpect(jsonPath("$.items[0].reported").doesNotExist())
                .andExpect(jsonPath("$.totalCount").value(42))
                .andExpect(jsonPath("$.page").value(3))
                .andExpect(jsonPath("$.pageSize").value(20))
                .andExpect(jsonPath("$.totalPages").value(3))
                .andExpect(jsonPath("$.majorCounts.CS").value(99))
                .andExpect(jsonPath("$.majorCounts.PERSONALITY").value(88));

        verify(service).getQuestions(query, member);
        verifyNoMoreInteractions(service);
    }

    @Test
    void 검색어의_100_코드포인트_경계를_HTTP에서도_허용한다() throws Exception {
        QuestionSearchRequest query = new QuestionSearchRequest(null, null, "😀".repeat(100), null, null, null, null);
        QuestionMember member = new QuestionMember(7L, Role.USER);
        when(service.getQuestions(query, member)).thenReturn(emptyResponse());

        mockMvc.perform(authenticatedRequest().param("keyword", "😀".repeat(100)))
                .andExpect(status().isOk());

        verify(service).getQuestions(query, member);
        verifyNoMoreInteractions(service);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("unverifiedRequests")
    void 검증된_principal이_없으면_서비스를_호출하지_않는다(
            String scenario, MockHttpServletRequestBuilder request) throws Exception {
        mockMvc.perform(request)
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"))
                .andExpect(jsonPath("$.message").value("로그인이 필요합니다."));

        verifyNoInteractions(service);
    }

    @Test
    void 이용정지_회원은_조회_전에_403을_받는다() throws Exception {
        mockMvc.perform(get(PATH)
                        .principal(new VerifiedPrincipal(7L, Role.USER, UserStatus.SUSPENDED, null)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"))
                .andExpect(jsonPath("$.message").value("이 요청을 처리할 권한이 없습니다."));

        verifyNoInteractions(service);
    }

    @ParameterizedTest(name = "{0}={1}")
    @MethodSource("invalidQueries")
    void 잘못된_쿼리는_400으로_거절하고_서비스를_호출하지_않는다(String field, String value) throws Exception {
        mockMvc.perform(authenticatedRequest().param(field, value))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.message").value(not(emptyOrNullString())));

        verifyNoInteractions(service);
    }

    private static Stream<Arguments> unverifiedRequests() {
        return Stream.of(
                Arguments.of("인증 정보 없음", get(PATH)),
                Arguments.of("회원 ID를 이름으로만 제공한 principal", get(PATH).principal(() -> "7")),
                Arguments.of("임의 회원 ID 헤더", get(PATH).header("X-User-Id", "7")),
                Arguments.of("검증되지 않은 Bearer 헤더", get(PATH).header("Authorization", "Bearer invalid-token")));
    }

    private static Stream<Arguments> invalidQueries() {
        return Stream.of(
                Arguments.of("page", "0"),
                Arguments.of("page", "-1"),
                Arguments.of("page", "1.5"),
                Arguments.of("page", "not-a-number"),
                Arguments.of("pageSize", "0"),
                Arguments.of("pageSize", "101"),
                Arguments.of("pageSize", "1.5"),
                Arguments.of("major", "EXPERIENCE"),
                Arguments.of("sort", "POPULAR"),
                Arguments.of("categoryId", "0"),
                Arguments.of("categoryId", "-1"),
                Arguments.of("categoryId", "not-an-id"),
                Arguments.of("keyword", "😀".repeat(101)));
    }

    private static MockHttpServletRequestBuilder authenticatedRequest() {
        return get(PATH).principal(new VerifiedPrincipal(7L, Role.USER, UserStatus.ACTIVE, null));
    }

    private static QuestionSearchRequest defaultQuery() {
        return new QuestionSearchRequest(QuestionMajor.CS, null, "", false, QuestionSort.LATEST, 1, 7);
    }

    private static QuestionListResponse emptyResponse() {
        return new QuestionListResponse(List.of(), 0, 1, 7, 1,
                Map.of(QuestionMajor.CS, 0L, QuestionMajor.PERSONALITY, 0L));
    }

    private record VerifiedPrincipal(Long userId, Role role, UserStatus status, Instant deletedAt)
            implements QuestionPrincipal {
    }
}
