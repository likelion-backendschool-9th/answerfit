package com.likelion.answerfit.question.exception;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.security.Principal;
import java.time.Instant;
import java.util.Map;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
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

import com.likelion.answerfit.document.QuestionAdviceIsolationController;
import com.likelion.answerfit.question.auth.QuestionAuthentication;
import com.likelion.answerfit.question.auth.QuestionPrincipal;
import com.likelion.answerfit.question.dto.request.CreateQuestionRequest;
import com.likelion.answerfit.question.dto.request.QuestionSearchRequest;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.user.entity.Role;
import com.likelion.answerfit.user.entity.UserStatus;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

class QuestionExceptionHandlerTest {

    private LocalValidatorFactoryBean validator;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mockMvc = MockMvcBuilders.standaloneSetup(new TestController(), new QuestionAdviceIsolationController())
                .setControllerAdvice(new QuestionExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @AfterEach
    void closeValidator() {
        validator.close();
    }

    @ParameterizedTest
    @EnumSource(QuestionErrorCode.class)
    void 업무_오류는_상태와_안전한_공통_응답을_반환한다(QuestionErrorCode code) throws Exception {
        mockMvc.perform(get("/test/question-errors/business/{code}", code.name()))
                .andExpect(status().is(code.getStatus().value()))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value(code.name()))
                .andExpect(jsonPath("$.message").value(code.getMessage()))
                .andExpect(jsonPath("$.fieldErrors").doesNotExist());
    }

    @Test
    void 본문의_모든_필드_오류를_보존한다() throws Exception {
        mockMvc.perform(post("/test/question-errors/body")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"categoryId\":null,\"content\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.fieldErrors", hasSize(3)))
                .andExpect(jsonPath("$.fieldErrors[*].field", containsInAnyOrder("categoryId", "content", "content")))
                .andExpect(jsonPath("$.fieldErrors[0].message").isString())
                .andExpect(jsonPath("$.fieldErrors[0].rejectedValue").doesNotExist());
    }

    @Test
    void 유효한_본문은_오류로_바꾸지_않는다() throws Exception {
        mockMvc.perform(post("/test/question-errors/body")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"categoryId\":1,\"content\":\"프로세스와 스레드의 차이는 무엇인가요?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.categoryId").value(1));
    }

    @Test
    void 깨진_JSON에_내부_파싱_오류를_노출하지_않는다() throws Exception {
        mockMvc.perform(post("/test/question-errors/body")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"categoryId\":1,\"content\":private-input"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.message").value(QuestionErrorCode.INVALID_REQUEST.getMessage()))
                .andExpect(content().string(not(containsString("private-input"))));
    }

    @Test
    void 필수_본문이_없어도_공통_오류를_반환한다() throws Exception {
        mockMvc.perform(post("/test/question-errors/body").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void JSON의_잘못된_타입을_거절한다() throws Exception {
        mockMvc.perform(post("/test/question-errors/body")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"categoryId\":\"private-input\",\"content\":\"프로세스와 스레드의 차이는?\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(content().string(not(containsString("private-input"))));
    }

    @Test
    void 쿼리_DTO의_검증_오류를_모두_반환한다() throws Exception {
        mockMvc.perform(get("/test/question-errors/search").param("page", "0").param("pageSize", "101"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.fieldErrors[*].field", containsInAnyOrder("page", "pageSize")));
    }

    @Test
    void 쿼리_타입_바인딩_실패에_거절된_값을_노출하지_않는다() throws Exception {
        mockMvc.perform(get("/test/question-errors/search").param("page", "private-input"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(content().string(not(containsString("private-input"))));
    }

    @Test
    void 쿼리_enum의_알_수_없는_값을_거절한다() throws Exception {
        mockMvc.perform(get("/test/question-errors/major").param("major", "private-input"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(content().string(not(containsString("private-input"))));
    }

    @Test
    void 필수_쿼리가_없어도_공통_오류를_반환한다() throws Exception {
        mockMvc.perform(get("/test/question-errors/major"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void 메서드_입력_검증은_400을_반환한다() throws Exception {
        mockMvc.perform(get("/test/question-errors/native-validation").param("page", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.fieldErrors", hasSize(1)));
    }

    @Test
    void 메서드_반환값_검증은_요청_오류가_아닌_500이다() throws Exception {
        mockMvc.perform(get("/test/question-errors/invalid-return"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.fieldErrors").doesNotExist());
    }

    @Test
    void 인증정보_없는_요청은_임의_헤더가_있어도_401이다() throws Exception {
        mockMvc.perform(get("/test/question-errors/member").header("X-User-Id", "1"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    void 이용정지_principal은_403이다() throws Exception {
        mockMvc.perform(get("/test/question-errors/member")
                        .principal(new TestPrincipal(1L, Role.USER, UserStatus.SUSPENDED, null)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }

    @Test
    void 검증된_정상_principal을_소비한다() throws Exception {
        mockMvc.perform(get("/test/question-errors/member")
                        .principal(new TestPrincipal(1L, Role.USER, UserStatus.ACTIVE, null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(1));
    }

    @Test
    void 다른_도메인의_업무_예외를_처리하지_않는다() {
        assertThatThrownBy(() -> mockMvc.perform(get("/test/other/errors")))
                .hasRootCauseInstanceOf(QuestionException.class);
    }

    @Test
    void 다른_도메인의_입력_오류_응답을_바꾸지_않는다() throws Exception {
        mockMvc.perform(get("/test/other/validation").param("page", "private-input"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(""));
    }

    @Test
    void 예상하지_못한_프로그램_오류를_400으로_숨기지_않는다() {
        assertThatThrownBy(() -> mockMvc.perform(get("/test/question-errors/unexpected")))
                .hasRootCauseInstanceOf(IllegalArgumentException.class);
    }

    private record TestPrincipal(Long userId, Role role, UserStatus status, Instant deletedAt)
            implements QuestionPrincipal {
    }

    @QuestionPlainApi
    @RestController
    @RequestMapping("/test/question-errors")
    public static class TestController {

        @GetMapping("/business/{code}")
        public void business(@PathVariable("code") QuestionErrorCode code) {
            throw new QuestionException(code);
        }

        @PostMapping("/body")
        public CreateQuestionRequest body(@Valid @RequestBody CreateQuestionRequest body) {
            return body;
        }

        @GetMapping("/search")
        public QuestionSearchRequest search(@Valid @ModelAttribute QuestionSearchRequest query) {
            return query;
        }

        @GetMapping("/major")
        public QuestionMajor major(@RequestParam("major") QuestionMajor major) {
            return major;
        }

        @GetMapping("/native-validation")
        public int nativeValidation(@RequestParam("page") @Min(value = 1, message = "페이지는 1 이상이어야 합니다.") int page) {
            return page;
        }

        @GetMapping("/invalid-return")
        @NotNull
        public String invalidReturn() {
            return null;
        }

        @GetMapping("/member")
        public Map<String, Long> member(Principal principal) {
            return Map.of("userId", QuestionAuthentication.requireMember(principal).userId());
        }

        @GetMapping("/unexpected")
        public void unexpected() {
            throw new IllegalArgumentException("private-db-detail");
        }
    }
}
