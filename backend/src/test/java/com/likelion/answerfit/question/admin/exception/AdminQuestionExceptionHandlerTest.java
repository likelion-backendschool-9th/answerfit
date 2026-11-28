package com.likelion.answerfit.question.admin.exception;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.endsWith;
import static org.hamcrest.Matchers.not;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Arrays;
import java.util.stream.Stream;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.likelion.answerfit.global.exception.CustomException;
import com.likelion.answerfit.global.exception.ErrorCode;
import com.likelion.answerfit.global.exception.GlobalExceptionHandler;
import com.likelion.answerfit.question.controller.CategoryController;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.exception.QuestionExceptionHandler;
import com.likelion.answerfit.question.service.CategoryService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

class AdminQuestionExceptionHandlerTest {

    private MockMvc mockMvc;
    private LocalValidatorFactoryBean validator;

    @BeforeEach
    void setUp() {
        validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mockMvc = MockMvcBuilders.standaloneSetup(new TestController(), new CategoryController(mock(CategoryService.class)))
                .setControllerAdvice(new QuestionExceptionHandler(), new AdminQuestionExceptionHandler(),
                        new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @AfterEach
    void closeValidator() {
        validator.close();
    }

    @Test
    void 관리자_오류_대역이_기존_오류와_겹치지_않는다() {
        assertThat(Arrays.stream(ErrorCode.values()).map(ErrorCode::getCode).toList()).doesNotHaveDuplicates();
    }

    @ParameterizedTest
    @MethodSource("adminErrorCodes")
    void 관리자_업무_오류는_공통_envelope와_고유_오류_코드를_반환한다(ErrorCode code) throws Exception {
        expectError(get("/test/admin-errors/business/{code}", code.name()), code)
                .andExpect(jsonPath("$.error.detail").value(code.getMessage()))
                .andExpect(jsonPath("$.error.validationErrors").doesNotExist());
    }

    @Test
    void 사용자_카테고리의_flat_오류_계약을_유지한다() throws Exception {
        mockMvc.perform(get("/api/v1/categories"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"))
                .andExpect(jsonPath("$.success").doesNotExist())
                .andExpect(jsonPath("$.error").doesNotExist());
    }

    @Test
    void 관리자_본문_검증은_필드별_한글_오류를_반환한다() throws Exception {
        expectError(post("/test/admin-errors/body").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"\"}"), ErrorCode.INVALID_INPUT)
                .andExpect(jsonPath("$.error.validationErrors.content").value("질문을 입력해 주세요."));
    }

    @Test
    void 쿼리_바인딩_실패에_거절된_값을_노출하지_않는다() throws Exception {
        expectError(get("/test/admin-errors/query").param("page", "private-input"), ErrorCode.INVALID_INPUT)
                .andExpect(jsonPath("$.error.validationErrors.page").value("입력 형식이 올바르지 않습니다."));
    }

    @Test
    void 메서드_입력_검증을_공통_필드_오류로_반환한다() throws Exception {
        expectError(get("/test/admin-errors/parameter").param("page", "0"), ErrorCode.INVALID_INPUT)
                .andExpect(jsonPath("$.error.validationErrors.page").value("페이지는 1 이상이어야 합니다."));
    }

    @Test
    void 잘못된_enum을_공통_입력_오류로_반환한다() throws Exception {
        expectError(get("/test/admin-errors/major").param("major", "private-input"), ErrorCode.INVALID_INPUT);
    }

    @ParameterizedTest
    @ValueSource(strings = {"{", "{\"content\":private-input}"})
    void 잘못된_JSON의_파싱_정보를_노출하지_않는다(String body) throws Exception {
        expectError(post("/test/admin-errors/body").contentType(MediaType.APPLICATION_JSON).content(body),
                ErrorCode.INVALID_INPUT);
    }

    @Test
    void 반환값_검증_실패는_입력_오류가_아닌_서버_오류다() throws Exception {
        expectError(get("/test/admin-errors/invalid-return"), ErrorCode.SERVER_ERROR)
                .andExpect(jsonPath("$.error.validationErrors").doesNotExist());
    }

    @Test
    void 잠금_경합은_재조회_가능한_409다() throws Exception {
        expectError(get("/test/admin-errors/lock"), ErrorCode.ADMIN_QUESTION_STATE_CHANGED);
        expectError(get("/test/admin-errors/revision"), ErrorCode.ADMIN_REVISION_CONFLICT);
    }

    @ParameterizedTest
    @ValueSource(strings = {"integrity", "unexpected"})
    void 알_수_없는_저장_프로그램_오류는_내부_정보_없는_500이다(String path) throws Exception {
        expectError(get("/test/admin-errors/" + path), ErrorCode.SERVER_ERROR);
    }

    @Test
    void 컨트롤러_인증과_인가_실패도_공통_envelope다() throws Exception {
        expectError(get("/test/admin-errors/unauthenticated"), ErrorCode.UNAUTHORIZED);
        expectError(get("/test/admin-errors/denied"), ErrorCode.FORBIDDEN);
    }

    @Test
    void 없는_API의_404와_관리자_질문_없음_404를_구별한다() throws Exception {
        expectError(get("/test/admin-errors/no-such-path"), ErrorCode.API_NOT_FOUND);
        expectError(get("/test/admin-errors/business/ADMIN_QUESTION_NOT_FOUND"), ErrorCode.ADMIN_QUESTION_NOT_FOUND);
    }

    private ResultActions expectError(MockHttpServletRequestBuilder request, ErrorCode code) throws Exception {
        return mockMvc.perform(request)
                .andExpect(status().is(code.getHttpStatus().value()))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.errorCode").value(code.getCode()))
                .andExpect(jsonPath("$.error.httpStatus").value(code.getHttpStatus().value()))
                .andExpect(jsonPath("$.error.type").isString())
                .andExpect(jsonPath("$.error.timestamp").value(endsWith("+09:00")))
                .andExpect(content().string(not(containsString("private-input"))))
                .andExpect(content().string(not(containsString("private-db-detail"))))
                .andExpect(jsonPath("$.code").doesNotExist());
    }

    private static Stream<ErrorCode> adminErrorCodes() {
        return Arrays.stream(ErrorCode.values()).filter(code -> code.name().startsWith("ADMIN_")
                || code.name().startsWith("QUESTION_AI_"));
    }

    record Body(@NotBlank(message = "질문을 입력해 주세요.") String content) {
    }

    record Query(@Min(value = 1, message = "페이지는 1 이상이어야 합니다.") int page) {
    }

    @RestController
    @RequestMapping("/test/admin-errors")
    public static class TestController {

        @GetMapping("/business/{code}")
        public void business(@PathVariable("code") ErrorCode code) {
            throw new CustomException(code);
        }

        @PostMapping("/body")
        public Body body(@Valid @RequestBody Body body) {
            return body;
        }

        @GetMapping("/query")
        public Query query(@Valid @ModelAttribute Query query) {
            return query;
        }

        @GetMapping("/parameter")
        public int parameter(@RequestParam("page") @Min(value = 1, message = "페이지는 1 이상이어야 합니다.") int page) {
            return page;
        }

        @GetMapping("/major")
        public QuestionMajor major(@RequestParam("major") QuestionMajor major) {
            return major;
        }

        @GetMapping("/invalid-return")
        @NotNull
        public String invalidReturn() {
            return null;
        }

        @GetMapping("/lock")
        public void lock() {
            throw new PessimisticLockingFailureException("private-db-detail");
        }

        @GetMapping("/revision")
        public void revision() {
            throw new OptimisticLockingFailureException("private-db-detail");
        }

        @GetMapping("/integrity")
        public void integrity() {
            throw new DataIntegrityViolationException("private-db-detail");
        }

        @GetMapping("/unexpected")
        public void unexpected() {
            throw new IllegalArgumentException("private-db-detail");
        }

        @GetMapping("/unauthenticated")
        public void unauthenticated() {
            throw new InsufficientAuthenticationException("private-db-detail");
        }

        @GetMapping("/denied")
        public void denied() {
            throw new AccessDeniedException("private-db-detail");
        }
    }
}
