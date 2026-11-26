package com.likelion.answerfit.global.exception;

import static org.hamcrest.Matchers.endsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

class GlobalExceptionHandlerTest {

    record NameRequest(@NotBlank String name) {
    }

    @RestController
    static class TestController {
        @GetMapping("/ping")
        String ping() {
            return "pong";
        }

        @GetMapping("/custom")
        void custom() {
            throw new CustomException(ErrorCode.USER_NOT_FOUND);
        }

        @GetMapping("/boom")
        void boom() {
            throw new IllegalStateException("boom");
        }

        @GetMapping("/conflict")
        void conflict() {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        @GetMapping("/param")
        String param(@RequestParam String name) {
            return name;
        }

        @PostMapping("/valid")
        void valid(@Valid @RequestBody NameRequest request) {
        }

        @GetMapping("/denied")
        void denied() {
            throw new org.springframework.security.access.AccessDeniedException("denied");
        }

        @GetMapping("/unauthenticated")
        void unauthenticated() {
            throw new org.springframework.security.authentication.InsufficientAuthenticationException("no token");
        }

        @GetMapping("/suspended")
        void suspended() {
            throw new CustomException(ErrorCode.SUSPENDED, "이용이 정지된 계정이에요. 사유: 반복 등록");
        }
    }

    private final MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new TestController())
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();

    private ResultActions expectError(MockHttpServletRequestBuilder request, ErrorCode errorCode) throws Exception {
        return mockMvc.perform(request)
                .andExpect(status().is(errorCode.getHttpStatus().value()))
                .andExpect(header().string("Content-Type", MediaType.APPLICATION_JSON_VALUE))
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.errorCode").value(errorCode.getCode()))
                .andExpect(jsonPath("$.error.httpStatus").value(errorCode.getHttpStatus().value()));
    }

    @Test
    void 없는_경로는_API_NOT_FOUND로_응답한다() throws Exception {
        expectError(get("/no-such-api"), ErrorCode.API_NOT_FOUND)
                .andExpect(jsonPath("$.error.type").value("/no-such-api"))
                .andExpect(jsonPath("$.error.timestamp").value(endsWith("+09:00")));
    }

    @Test
    void 지원하지_않는_메서드는_METHOD_NOT_ALLOWED로_응답한다() throws Exception {
        expectError(post("/ping"), ErrorCode.METHOD_NOT_ALLOWED)
                .andExpect(header().string("Allow", "GET"));
    }

    @Test
    void CustomException은_그_에러_코드로_응답한다() throws Exception {
        expectError(get("/custom"), ErrorCode.USER_NOT_FOUND)
                .andExpect(jsonPath("$.error.type").value("/custom"))
                .andExpect(jsonPath("$.error.detail").value(ErrorCode.USER_NOT_FOUND.getMessage()));
    }

    @Test
    void 검증_실패는_INVALID_INPUT과_필드별_메시지로_응답한다() throws Exception {
        expectError(post("/valid").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"\"}"), ErrorCode.INVALID_INPUT)
                .andExpect(jsonPath("$.error.validationErrors.name").exists());
    }

    @Test
    void JSON_형식_오류는_INVALID_INPUT으로_응답한다() throws Exception {
        expectError(post("/valid").contentType(MediaType.APPLICATION_JSON).content("{"), ErrorCode.INVALID_INPUT);
    }

    @Test
    void 지원하지_않는_Content_Type은_UNSUPPORTED_MEDIA_TYPE으로_응답한다() throws Exception {
        expectError(post("/valid").contentType(MediaType.TEXT_PLAIN).content("name"), ErrorCode.UNSUPPORTED_MEDIA_TYPE);
    }

    @Test
    void 필수_파라미터_누락은_INVALID_INPUT으로_응답한다() throws Exception {
        expectError(get("/param"), ErrorCode.INVALID_INPUT);
    }

    // ResponseStatusException 대신 CustomException을 쓴다. 던지더라도 같은 형식으로 나가게 한다.
    @Test
    void ResponseStatusException은_INVALID_INPUT으로_응답한다() throws Exception {
        expectError(get("/conflict"), ErrorCode.INVALID_INPUT);
    }

    @Test
    void 컨트롤러_안의_권한_거부는_500이_아니라_FORBIDDEN() throws Exception {
        expectError(get("/denied"), ErrorCode.FORBIDDEN);
    }

    @Test
    void 컨트롤러_안의_인증_실패는_500이_아니라_UNAUTHORIZED() throws Exception {
        expectError(get("/unauthenticated"), ErrorCode.UNAUTHORIZED);
    }

    @Test
    void CustomException에_넣은_문장이_detail로_나간다() throws Exception {
        expectError(get("/suspended"), ErrorCode.SUSPENDED)
                .andExpect(jsonPath("$.error.detail").value("이용이 정지된 계정이에요. 사유: 반복 등록"));
    }

    @Test
    void 처리하지_못한_예외는_SERVER_ERROR로_응답한다() throws Exception {
        expectError(get("/boom"), ErrorCode.SERVER_ERROR)
                .andExpect(jsonPath("$.error.type").value("/boom"));
    }
}
