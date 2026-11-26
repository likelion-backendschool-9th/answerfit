package com.likelion.answerfit.question.controller;

import static org.hamcrest.Matchers.hasSize;
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

import com.likelion.answerfit.question.auth.QuestionPrincipal;
import com.likelion.answerfit.question.dto.response.CategoryResponse;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.exception.QuestionExceptionHandler;
import com.likelion.answerfit.question.service.CategoryService;
import com.likelion.answerfit.user.entity.Role;
import com.likelion.answerfit.user.entity.UserStatus;

class CategoryControllerTest {

    private static final String PATH = "/api/v1/categories";

    private CategoryService service;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        service = mock(CategoryService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new CategoryController(service))
                .setControllerAdvice(new QuestionExceptionHandler())
                .build();
    }

    @ParameterizedTest
    @EnumSource(Role.class)
    void 정상_회원과_관리자는_대분류와_카테고리를_조회한다(Role role) throws Exception {
        when(service.getCategories()).thenReturn(new CategoryResponse(List.of(
                new CategoryResponse.MajorGroup(QuestionMajor.CS, "CS", 12, List.of(
                        new CategoryResponse.Item("9007199254740993", "운영체제", 10, 12),
                        new CategoryResponse.Item("2", "네트워크", 20, 0))),
                new CategoryResponse.MajorGroup(QuestionMajor.PERSONALITY, "인성 면접", 3, List.of(
                        new CategoryResponse.Item("3", "협업", 10, 1))))));

        mockMvc.perform(get(PATH).principal(new VerifiedPrincipal(7L, role, UserStatus.ACTIVE, null)))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.majors", hasSize(2)))
                .andExpect(jsonPath("$.majors[0].major").value("CS"))
                .andExpect(jsonPath("$.majors[0].name").value("CS"))
                .andExpect(jsonPath("$.majors[0].questionCount").value(12))
                .andExpect(jsonPath("$.majors[0].categories", hasSize(2)))
                .andExpect(jsonPath("$.majors[0].categories[0].id").isString())
                .andExpect(jsonPath("$.majors[0].categories[0].id").value("9007199254740993"))
                .andExpect(jsonPath("$.majors[0].categories[0].name").value("운영체제"))
                .andExpect(jsonPath("$.majors[0].categories[0].sortOrder").value(10))
                .andExpect(jsonPath("$.majors[0].categories[0].questionCount").value(12))
                .andExpect(jsonPath("$.majors[0].categories[1].questionCount").value(0))
                .andExpect(jsonPath("$.majors[1].major").value("PERSONALITY"))
                .andExpect(jsonPath("$.majors[1].name").value("인성 면접"))
                .andExpect(jsonPath("$.majors[1].questionCount").value(3))
                .andExpect(jsonPath("$.majors[1].categories[0].id").value("3"))
                .andExpect(jsonPath("$.majors[1].categories[0].name").value("협업"));

        verify(service).getCategories();
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
                .andExpect(jsonPath("$.message").value("로그인이 필요합니다."))
                .andExpect(jsonPath("$.fieldErrors").doesNotExist());

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

    @Test
    void 탈퇴_회원은_정상_상태가_남아_있어도_401을_받는다() throws Exception {
        mockMvc.perform(get(PATH)
                        .principal(new VerifiedPrincipal(7L, Role.USER, UserStatus.ACTIVE, Instant.now())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"))
                .andExpect(jsonPath("$.message").value("로그인이 필요합니다."));

        verifyNoInteractions(service);
    }

    private static Stream<Arguments> unverifiedRequests() {
        return Stream.of(
                Arguments.of("인증 정보 없음", get(PATH)),
                Arguments.of("회원 ID를 이름으로만 제공한 principal", get(PATH).principal(() -> "7")),
                Arguments.of("임의 회원 ID 헤더", get(PATH).header("X-User-Id", "7")),
                Arguments.of("검증되지 않은 Bearer 헤더", get(PATH).header("Authorization", "Bearer invalid-token")));
    }

    private record VerifiedPrincipal(Long userId, Role role, UserStatus status, Instant deletedAt)
            implements QuestionPrincipal {
    }
}
