package com.likelion.answerfit.question.controller;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
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
import java.util.stream.Stream;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import com.likelion.answerfit.question.auth.QuestionMember;
import com.likelion.answerfit.question.auth.QuestionPrincipal;
import com.likelion.answerfit.question.dto.response.QuestionDetailResponse;
import com.likelion.answerfit.question.entity.ModelAnswerStatus;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.entity.QuestionSource;
import com.likelion.answerfit.question.entity.QuestionStatus;
import com.likelion.answerfit.question.exception.QuestionErrorCode;
import com.likelion.answerfit.question.exception.QuestionException;
import com.likelion.answerfit.question.exception.QuestionExceptionHandler;
import com.likelion.answerfit.question.service.QuestionQueryService;
import com.likelion.answerfit.user.entity.Role;
import com.likelion.answerfit.user.entity.UserStatus;

class QuestionDetailControllerTest {

    private static final String PATH = "/api/v1/learning/questions/{questionId}";
    private static final long QUESTION_ID = Long.MAX_VALUE;
    private static final Instant CREATED_AT = Instant.parse("2026-11-26T01:02:03Z");
    private static final Instant REVIEWED_AT = Instant.parse("2026-11-26T02:03:04Z");

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
    void 정상_회원과_관리자는_인증된_신원으로_상세를_조회한다(Role role) throws Exception {
        QuestionMember member = new QuestionMember(7L, role);
        when(service.getQuestion(QUESTION_ID, member)).thenReturn(publishedResponse());

        mockMvc.perform(get(PATH, QUESTION_ID)
                        .principal(new VerifiedPrincipal(7L, role, UserStatus.ACTIVE, null))
                        .header("X-User-Id", "999").param("userId", "999"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.id").isString())
                .andExpect(jsonPath("$.id").value(Long.toString(QUESTION_ID)))
                .andExpect(jsonPath("$.major").value("CS"))
                .andExpect(jsonPath("$.category.id").isString())
                .andExpect(jsonPath("$.category.id").value("9007199254740993"))
                .andExpect(jsonPath("$.category.name").value("운영체제"))
                .andExpect(jsonPath("$.content").value("프로세스와 스레드의 차이는?"))
                .andExpect(jsonPath("$.source").value("USER"))
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.createdAt").value("2026-11-26T01:02:03Z"))
                .andExpect(jsonPath("$.reviewedAt").value("2026-11-26T02:03:04Z"))
                .andExpect(jsonPath("$.likeCount").value(4))
                .andExpect(jsonPath("$.isLiked").value(true))
                .andExpect(jsonPath("$.isMine").value(false))
                .andExpect(jsonPath("$.isReported").value(true))
                .andExpect(jsonPath("$.canEdit").value(false))
                .andExpect(jsonPath("$.canDelete").value(false))
                .andExpect(jsonPath("$.canReport").value(false))
                .andExpect(jsonPath("$.modelAnswer").value("프로세스는 실행 중인 프로그램이고 스레드는 실행 단위입니다."))
                .andExpect(jsonPath("$.modelAnswerStatus").value("DONE"))
                .andExpect(jsonPath("$.keywords", contains("프로세스", "스레드")))
                .andExpect(jsonPath("$.rejectionReason").value(nullValue()))
                .andExpect(jsonPath("$.previous.id").isString())
                .andExpect(jsonPath("$.previous.id").value("9223372036854775806"))
                .andExpect(jsonPath("$.previous.content").value("프로세스의 상태 전이는?"))
                .andExpect(jsonPath("$.next.id").isString())
                .andExpect(jsonPath("$.next.id").value("42"))
                .andExpect(jsonPath("$.next.content").value("스레드 간 동기화 방법은?"))
                .andExpect(jsonPath("$.authorId").doesNotExist())
                .andExpect(jsonPath("$.reviewedBy").doesNotExist())
                .andExpect(jsonPath("$.liked").doesNotExist())
                .andExpect(jsonPath("$.mine").doesNotExist())
                .andExpect(jsonPath("$.reported").doesNotExist());

        verify(service).getQuestion(QUESTION_ID, member);
        verifyNoMoreInteractions(service);
    }

    @Test
    void 중분류와_답안이_없는_관리자_인성_질문도_nullable_계약을_유지한다() throws Exception {
        QuestionMember member = new QuestionMember(7L, Role.USER);
        when(service.getQuestion(42L, member)).thenReturn(new QuestionDetailResponse(
                "42", QuestionMajor.PERSONALITY, null, "협업 과정에서 배운 점은?",
                QuestionSource.ADMIN, QuestionStatus.APPROVED, CREATED_AT, REVIEWED_AT,
                0, false, false, false, false, false, true,
                null, null, List.of(), null, null, null));

        mockMvc.perform(authenticatedRequest("42"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.major").value("PERSONALITY"))
                .andExpect(jsonPath("$.source").value("ADMIN"))
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.category").value(nullValue()))
                .andExpect(jsonPath("$.modelAnswer").value(nullValue()))
                .andExpect(jsonPath("$.modelAnswerStatus").value(nullValue()))
                .andExpect(jsonPath("$.keywords", hasSize(0)))
                .andExpect(jsonPath("$.rejectionReason").value(nullValue()))
                .andExpect(jsonPath("$.previous").value(nullValue()))
                .andExpect(jsonPath("$.next").value(nullValue()))
                .andExpect(jsonPath("$.canReport").value(true));

        verify(service).getQuestion(42L, member);
        verifyNoMoreInteractions(service);
    }

    @Test
    void 본인_반려_질문의_사유와_수정_삭제_가능_여부를_그대로_반환한다() throws Exception {
        QuestionMember member = new QuestionMember(7L, Role.USER);
        when(service.getQuestion(42L, member)).thenReturn(new QuestionDetailResponse(
                "42", QuestionMajor.CS, new QuestionDetailResponse.CategoryItem("1", "운영체제"),
                "프로세스와 스레드의 차이는?", QuestionSource.USER, QuestionStatus.REJECTED,
                CREATED_AT, REVIEWED_AT, 0, false, true, false, true, true, false,
                null, null, List.of(), "질문의 범위를 구체적으로 정해 주세요.", null, null));

        mockMvc.perform(authenticatedRequest("42"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.isMine").value(true))
                .andExpect(jsonPath("$.canEdit").value(true))
                .andExpect(jsonPath("$.canDelete").value(true))
                .andExpect(jsonPath("$.canReport").value(false))
                .andExpect(jsonPath("$.rejectionReason").value("질문의 범위를 구체적으로 정해 주세요."))
                .andExpect(jsonPath("$.previous").value(nullValue()))
                .andExpect(jsonPath("$.next").value(nullValue()));

        verify(service).getQuestion(42L, member);
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

    @ParameterizedTest(name = "{0}")
    @MethodSource("inaccessibleAccounts")
    void 이용정지와_탈퇴_회원은_조회_전에_거절한다(
            String scenario, VerifiedPrincipal principal, int httpStatus, String code, String message) throws Exception {
        mockMvc.perform(get(PATH, 42).principal(principal))
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
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.message").isString());

        verifyNoInteractions(service);
    }

    @Test
    void 존재하지_않거나_조회할_수_없는_질문은_동일한_404를_반환한다() throws Exception {
        QuestionMember member = new QuestionMember(7L, Role.USER);
        when(service.getQuestion(42L, member))
                .thenThrow(new QuestionException(QuestionErrorCode.QUESTION_NOT_FOUND));

        mockMvc.perform(authenticatedRequest("42"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value("QUESTION_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("질문을 찾을 수 없습니다."))
                .andExpect(jsonPath("$.fieldErrors").doesNotExist());

        verify(service).getQuestion(42L, member);
        verifyNoMoreInteractions(service);
    }

    private static QuestionDetailResponse publishedResponse() {
        return new QuestionDetailResponse(Long.toString(QUESTION_ID), QuestionMajor.CS,
                new QuestionDetailResponse.CategoryItem("9007199254740993", "운영체제"),
                "프로세스와 스레드의 차이는?", QuestionSource.USER, QuestionStatus.APPROVED,
                CREATED_AT, REVIEWED_AT, 4, true, false, true, false, false, false,
                "프로세스는 실행 중인 프로그램이고 스레드는 실행 단위입니다.", ModelAnswerStatus.DONE,
                List.of("프로세스", "스레드"), null,
                new QuestionDetailResponse.Neighbor("9223372036854775806", "프로세스의 상태 전이는?"),
                new QuestionDetailResponse.Neighbor("42", "스레드 간 동기화 방법은?"));
    }

    private static MockHttpServletRequestBuilder authenticatedRequest(String id) {
        return get(PATH, id).principal(new VerifiedPrincipal(7L, Role.USER, UserStatus.ACTIVE, null));
    }

    private static Stream<Arguments> unverifiedRequests() {
        return Stream.of(
                Arguments.of("인증 정보 없음", get(PATH, 42)),
                Arguments.of("회원 ID를 이름으로만 제공한 principal", get(PATH, 42).principal(() -> "7")),
                Arguments.of("임의 회원 ID 헤더", get(PATH, 42).header("X-User-Id", "7")),
                Arguments.of("검증되지 않은 Bearer 헤더", get(PATH, 42).header("Authorization", "Bearer invalid-token")));
    }

    private static Stream<Arguments> inaccessibleAccounts() {
        return Stream.of(
                Arguments.of("이용정지", new VerifiedPrincipal(7L, Role.USER, UserStatus.SUSPENDED, null),
                        403, "ACCESS_DENIED", "이 요청을 처리할 권한이 없습니다."),
                Arguments.of("탈퇴", new VerifiedPrincipal(7L, Role.USER, UserStatus.ACTIVE, CREATED_AT),
                        401, "UNAUTHENTICATED", "로그인이 필요합니다."));
    }

    private record VerifiedPrincipal(Long userId, Role role, UserStatus status, Instant deletedAt)
            implements QuestionPrincipal {
    }
}
