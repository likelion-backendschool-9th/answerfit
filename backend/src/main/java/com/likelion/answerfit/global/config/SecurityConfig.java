package com.likelion.answerfit.global.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;

import com.likelion.answerfit.global.common.ApiResponse;
import com.likelion.answerfit.global.exception.ErrorCode;
import com.likelion.answerfit.global.exception.ErrorResponse;
import com.likelion.answerfit.question.admin.auth.AdminQuestionAuthentication;
import com.likelion.answerfit.question.auth.QuestionJwtAuthenticationConverter;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import tools.jackson.databind.json.JsonMapper;

/** 서버 세션 없이 Bearer JWT로만 회원을 확인한다. 로그인 API만 토큰 없이 부를 수 있다. */
@Configuration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@RequiredArgsConstructor
public class SecurityConfig {

    private final JsonMapper jsonMapper;
    private final QuestionJwtAuthenticationConverter questionJwtAuthenticationConverter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        // 필터에서 막힌 요청도 컨트롤러와 같은 ApiResponse 형식으로 답한다 (docs/api-response.md)
        AuthenticationEntryPoint unauthorized = (request, response, e) -> fail(request, response, ErrorCode.UNAUTHORIZED);
        AccessDeniedHandler forbidden = (request, response, e) -> fail(request, response, ErrorCode.FORBIDDEN);
        http
                .csrf(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/auth/**", "/error").permitAll()
                        .requestMatchers("/api/v1/admin", "/api/v1/admin/**")
                        .access((authentication, context) -> {
                            var principal = authentication.get();
                            return new AuthorizationDecision(principal != null && principal.isAuthenticated()
                                    && AdminQuestionAuthentication.canAccess(principal));
                        })
                        .anyRequest().authenticated())
                .oauth2ResourceServer(server -> server
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(questionJwtAuthenticationConverter))
                        .authenticationEntryPoint(unauthorized)
                        .accessDeniedHandler(forbidden))
                .exceptionHandling(handling -> handling
                        .authenticationEntryPoint(unauthorized)
                        .accessDeniedHandler(forbidden));
        return http.build();
    }

    private void fail(HttpServletRequest request, HttpServletResponse response, ErrorCode errorCode) throws IOException {
        response.setStatus(errorCode.getHttpStatus().value());
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        jsonMapper.writeValue(response.getWriter(), ApiResponse.fail(new ErrorResponse(request.getRequestURI(), errorCode)));
    }
}
