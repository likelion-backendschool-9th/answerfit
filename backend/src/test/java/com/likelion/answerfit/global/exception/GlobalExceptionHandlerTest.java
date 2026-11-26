package com.likelion.answerfit.global.exception;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

class GlobalExceptionHandlerTest {

    @RestController
    static class PingController {
        @GetMapping("/ping")
        String ping() {
            return "pong";
        }
    }

    private final MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new PingController())
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();

    @Test
    void 없는_경로는_API_NOT_FOUND로_응답한다() throws Exception {
        mockMvc.perform(get("/no-such-api"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.error.errorCode").value(ErrorCode.API_NOT_FOUND.getCode()))
                .andExpect(jsonPath("$.error.type").value("http://localhost/no-such-api"));
    }

    @Test
    void 지원하지_않는_메서드는_METHOD_NOT_ALLOWED로_응답한다() throws Exception {
        mockMvc.perform(post("/ping"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(header().string("Allow", "GET"))
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.errorCode").value(ErrorCode.METHOD_NOT_ALLOWED.getCode()));
    }
}
