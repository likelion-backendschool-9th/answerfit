package com.likelion.answerfit.question.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.stream.Stream;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import com.likelion.answerfit.question.auth.QuestionMember;
import com.likelion.answerfit.question.auth.QuestionPrincipal;
import com.likelion.answerfit.question.dto.response.QuestionLikeResponse;
import com.likelion.answerfit.question.exception.QuestionErrorCode;
import com.likelion.answerfit.question.exception.QuestionException;
import com.likelion.answerfit.question.exception.QuestionExceptionHandler;
import com.likelion.answerfit.question.service.QuestionLikeService;
import com.likelion.answerfit.user.entity.Role;
import com.likelion.answerfit.user.entity.UserStatus;

class QuestionLikeControllerTest {

    private static final String PATH = "/api/v1/learning/questions/{questionId}/likes";

    private QuestionLikeService service;
    private MockMvc mockMvc;
    private LocalValidatorFactoryBean validator;

    @BeforeEach
    void setUp() {
        service = mock(QuestionLikeService.class);
        validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mockMvc = MockMvcBuilders.standaloneSetup(new QuestionLikeController(service))
                .setControllerAdvice(new QuestionExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @AfterEach
    void closeValidator() {
        validator.close();
    }

    @ParameterizedTest(name = "{0}/{1}")
    @MethodSource("authenticatedOperations")
    void 정상_회원과_관리자의_좋아요_상태를_인증된_신원으로_변경한다(Operation operation, Role role) throws Exception {
        QuestionMember member = new QuestionMember(7L, role);
        int likeCount = operation == Operation.POST ? 12 : 11;
        when(operation == Operation.POST
                ? service.likeQuestion(Long.MAX_VALUE, member)
                : service.unlikeQuestion(Long.MAX_VALUE, member))
                .thenReturn(new QuestionLikeResponse(likeCount, operation.liked));

        mockMvc.perform(httpRequest(operation, Long.toString(Long.MAX_VALUE))
                        .principal(new VerifiedPrincipal(7L, role, UserStatus.ACTIVE, null))
                        .header("X-User-Id", "999").param("userId", "999"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.likeCount").isNumber())
                .andExpect(jsonPath("$.likeCount").value(likeCount))
                .andExpect(jsonPath("$.isLiked").value(operation.liked))
                .andExpect(jsonPath("$.liked").doesNotExist());

        verifyCommand(operation, Long.MAX_VALUE, member);
    }

    @ParameterizedTest(name = "{0}: {1}")
    @MethodSource("unverifiedRequests")
    void 검증된_principal이_없으면_좋아요_서비스를_호출하지_않는다(
            Operation operation, String scenario, MockHttpServletRequestBuilder request) throws Exception {
        mockMvc.perform(request)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"))
                .andExpect(jsonPath("$.message").value("로그인이 필요합니다."));

        verifyNoInteractions(service);
    }

    @ParameterizedTest(name = "{0}: {1}")
    @MethodSource("inaccessibleAccounts")
    void 이용정지와_탈퇴_회원은_상태_변경_전에_거절한다(
            Operation operation, String scenario, VerifiedPrincipal principal, int httpStatus,
            String code, String message) throws Exception {
        mockMvc.perform(httpRequest(operation, "42").principal(principal))
                .andExpect(status().is(httpStatus))
                .andExpect(jsonPath("$.code").value(code))
                .andExpect(jsonPath("$.message").value(message));

        verifyNoInteractions(service);
    }

    @ParameterizedTest(name = "{0}: id={1}")
    @MethodSource("invalidIds")
    void 양수가_아니거나_Long으로_변환할_수_없는_ID는_400이다(Operation operation, String id) throws Exception {
        mockMvc.perform(authenticatedRequest(operation, id))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));

        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @EnumSource(Operation.class)
    void 공개_질문이_아니면_서비스의_동일한_404를_반환한다(Operation operation) throws Exception {
        QuestionMember member = new QuestionMember(7L, Role.USER);
        when(operation == Operation.POST ? service.likeQuestion(42L, member) : service.unlikeQuestion(42L, member))
                .thenThrow(new QuestionException(QuestionErrorCode.QUESTION_NOT_FOUND));

        mockMvc.perform(authenticatedRequest(operation, "42"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value("QUESTION_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("질문을 찾을 수 없습니다."));

        verifyCommand(operation, 42L, member);
    }

    @ParameterizedTest
    @EnumSource(Operation.class)
    void 잠금_획득_실패는_내부_메시지_없이_409를_반환한다(Operation operation) throws Exception {
        QuestionMember member = new QuestionMember(7L, Role.USER);
        when(operation == Operation.POST ? service.likeQuestion(42L, member) : service.unlikeQuestion(42L, member))
                .thenThrow(new CannotAcquireLockException("private-lock-details"));

        mockMvc.perform(authenticatedRequest(operation, "42"))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value("QUESTION_STATE_CHANGED"))
                .andExpect(jsonPath("$.message").value("질문의 상태가 변경되었습니다. 다시 확인해 주세요."))
                .andExpect(content().string(not(containsString("private-lock-details"))));

        verifyCommand(operation, 42L, member);
    }

    private void verifyCommand(Operation operation, long id, QuestionMember member) {
        if (operation == Operation.POST) {
            verify(service).likeQuestion(id, member);
        } else {
            verify(service).unlikeQuestion(id, member);
        }
        verifyNoMoreInteractions(service);
    }

    private static Stream<Arguments> authenticatedOperations() {
        return Stream.of(Operation.values())
                .flatMap(operation -> Stream.of(Role.values()).map(role -> Arguments.of(operation, role)));
    }

    private static Stream<Arguments> unverifiedRequests() {
        return Stream.of(Operation.values()).flatMap(operation -> Stream.of(
                Arguments.of(operation, "인증 정보 없음", httpRequest(operation, "42")),
                Arguments.of(operation, "이름만 회원 ID인 principal", httpRequest(operation, "42").principal(() -> "7")),
                Arguments.of(operation, "임의 회원 ID 헤더와 쿼리", httpRequest(operation, "42")
                        .header("X-User-Id", "7").param("userId", "7")),
                Arguments.of(operation, "검증되지 않은 Bearer 헤더", httpRequest(operation, "42")
                        .header("Authorization", "Bearer invalid-token"))));
    }

    private static Stream<Arguments> inaccessibleAccounts() {
        return Stream.of(Operation.values()).flatMap(operation -> Stream.of(
                Arguments.of(operation, "이용정지", new VerifiedPrincipal(7L, Role.USER, UserStatus.SUSPENDED, null),
                        403, "ACCESS_DENIED", "이 요청을 처리할 권한이 없습니다."),
                Arguments.of(operation, "탈퇴", new VerifiedPrincipal(7L, Role.USER, UserStatus.ACTIVE,
                        Instant.parse("2026-11-26T01:02:03Z")),
                        401, "UNAUTHENTICATED", "로그인이 필요합니다.")));
    }

    private static Stream<Arguments> invalidIds() {
        return Stream.of(Operation.values()).flatMap(operation -> Stream.of("0", "-1", "not-a-number", "9223372036854775808")
                .map(id -> Arguments.of(operation, id)));
    }

    private static MockHttpServletRequestBuilder httpRequest(Operation operation, String id) {
        return request(operation.method, PATH, id);
    }

    private static MockHttpServletRequestBuilder authenticatedRequest(Operation operation, String id) {
        return httpRequest(operation, id).principal(new VerifiedPrincipal(7L, Role.USER, UserStatus.ACTIVE, null));
    }

    private enum Operation {
        POST(HttpMethod.POST, true),
        DELETE(HttpMethod.DELETE, false);

        private final HttpMethod method;
        private final boolean liked;

        Operation(HttpMethod method, boolean liked) {
            this.method = method;
            this.liked = liked;
        }
    }

    private record VerifiedPrincipal(Long userId, Role role, UserStatus status, Instant deletedAt)
            implements QuestionPrincipal {
    }
}
