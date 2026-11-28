package com.likelion.answerfit.question.admin.auth;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.security.Principal;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import com.likelion.answerfit.auth.jwt.TokenService;
import com.likelion.answerfit.global.common.ApiResponse;
import com.likelion.answerfit.global.exception.ErrorCode;
import com.likelion.answerfit.user.entity.Role;
import com.likelion.answerfit.user.entity.User;
import com.likelion.answerfit.user.repository.UserRepository;

import jakarta.persistence.EntityManager;

@SpringBootTest(properties = {
        "answerfit.jwt.secret=admin-question-security-test-secret-at-least-32-bytes",
        "answerfit.question.seed-enabled=true"})
@AutoConfigureMockMvc(addFilters = true)
@Import(AdminQuestionSecurityIntegrationTest.ProbeController.class)
@Transactional
class AdminQuestionSecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private TokenService tokenService;

    @Autowired
    private JwtEncoder jwtEncoder;

    @ParameterizedTest
    @EnumSource(Endpoint.class)
    void 모든_관리자_진입점은_토큰이_없으면_공통_401이다(Endpoint endpoint) throws Exception {
        assertDenied(endpoint, null, ErrorCode.UNAUTHORIZED);
    }

    @ParameterizedTest
    @EnumSource(Endpoint.class)
    void 일반_회원은_ADMIN_클레임과_임의_신원을_보내도_모든_진입점에서_403이다(Endpoint endpoint) throws Exception {
        User member = user("member", Role.USER);
        String token = signedToken(member.getId().toString(), TokenService.ISSUER, "ADMIN", false);
        flushAndClear();

        mockMvc.perform(bearer(endpoint, token)
                        .header("X-User-Id", "999")
                        .header("X-Admin-Id", "999")
                        .param("adminId", "999")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"adminId\":\"999\",\"role\":\"ADMIN\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.errorCode").value(ErrorCode.FORBIDDEN.getCode()))
                .andExpect(jsonPath("$.error.httpStatus").value(403))
                .andExpect(jsonPath("$.data").isEmpty())
                .andExpect(jsonPath("$.code").doesNotExist());
    }

    @ParameterizedTest
    @EnumSource(Endpoint.class)
    void DB의_정상_관리자는_USER_클레임이어도_모든_진입점의_인가를_통과한다(Endpoint endpoint) throws Exception {
        User admin = user("admin", Role.ADMIN);
        String token = signedToken(admin.getId().toString(), TokenService.ISSUER, "USER", false);
        flushAndClear();

        assertAllowed(endpoint, token, admin.getId());
    }

    @ParameterizedTest
    @EnumSource(Endpoint.class)
    void 발급_후_정지된_관리자는_모든_진입점에서_현재_DB_상태로_403이다(Endpoint endpoint) throws Exception {
        User admin = user("suspended", Role.ADMIN);
        String token = tokenService.issue(admin);
        admin.suspend("관리자 이용 정지");
        flushAndClear();

        assertDenied(endpoint, token, ErrorCode.FORBIDDEN);
    }

    @ParameterizedTest
    @EnumSource(Endpoint.class)
    void 발급_후_탈퇴한_관리자는_모든_진입점에서_401이다(Endpoint endpoint) throws Exception {
        User admin = user("withdrawn", Role.ADMIN);
        String token = tokenService.issue(admin);
        admin.delete();
        flushAndClear();

        assertDenied(endpoint, token, ErrorCode.UNAUTHORIZED);
    }

    @Test
    void 같은_JWT로도_DB의_권한_승격과_강등을_즉시_반영한다() throws Exception {
        User member = user("role-change", Role.USER);
        String token = tokenService.issue(member);
        flushAndClear();

        for (Endpoint endpoint : Endpoint.values()) {
            assertDenied(endpoint, token, ErrorCode.FORBIDDEN);
        }

        changeRole(member.getId(), Role.ADMIN);
        for (Endpoint endpoint : Endpoint.values()) {
            assertAllowed(endpoint, token, member.getId());
        }

        changeRole(member.getId(), Role.USER);
        for (Endpoint endpoint : Endpoint.values()) {
            assertDenied(endpoint, token, ErrorCode.FORBIDDEN);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"EXPIRED", "WRONG_ISSUER", "FORGED_SIGNATURE"})
    void 유효하지_않은_서명이나_클레임은_관리자_인가_전에_401이다(String scenario) throws Exception {
        User admin = user("invalid-token", Role.ADMIN);
        String token = signedToken(admin.getId().toString(),
                scenario.equals("WRONG_ISSUER") ? "other-service" : TokenService.ISSUER,
                "ADMIN", scenario.equals("EXPIRED"));
        if (scenario.equals("FORGED_SIGNATURE")) {
            String[] sections = token.split("\\.");
            byte[] signature = Base64.getUrlDecoder().decode(sections[2]);
            signature[0] ^= 1;
            token = sections[0] + "." + sections[1] + "."
                    + Base64.getUrlEncoder().withoutPadding().encodeToString(signature);
        }
        flushAndClear();

        assertDenied(Endpoint.LIST, token, ErrorCode.UNAUTHORIZED);
    }

    @Test
    void 존재하지_않는_회원의_유효한_서명도_401이다() throws Exception {
        String token = signedToken(Long.toString(Long.MAX_VALUE), TokenService.ISSUER, "ADMIN", false);

        assertDenied(Endpoint.LIST, token, ErrorCode.UNAUTHORIZED);
    }

    @Test
    void 관리자_인가를_추가해도_회원_envelope와_사용자_문제은행_flat_계약은_유지한다() throws Exception {
        User admin = user("compatibility", Role.ADMIN);
        String token = tokenService.issue(admin);
        flushAndClear();

        mockMvc.perform(get("/api/v1/members/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.role").value("admin"));
        mockMvc.perform(get("/api/v1/categories").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.majors").isArray())
                .andExpect(jsonPath("$.success").doesNotExist());
        mockMvc.perform(get("/api/v1/learning/questions/{questionId}", Long.MAX_VALUE)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("QUESTION_NOT_FOUND"))
                .andExpect(jsonPath("$.success").doesNotExist());
    }

    private void assertDenied(Endpoint endpoint, String token, ErrorCode errorCode) throws Exception {
        MockHttpServletRequestBuilder request = endpoint.request();
        if (token != null) request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        mockMvc.perform(request)
                .andExpect(status().is(errorCode.getHttpStatus().value()))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data").isEmpty())
                .andExpect(jsonPath("$.error.errorCode").value(errorCode.getCode()))
                .andExpect(jsonPath("$.error.httpStatus").value(errorCode.getHttpStatus().value()))
                .andExpect(jsonPath("$.error.detail").value(errorCode.getMessage()))
                .andExpect(jsonPath("$.code").doesNotExist())
                .andExpect(content().string(not(containsString("Exception"))));
    }

    private void assertAllowed(Endpoint endpoint, String token, Long adminId) throws Exception {
        mockMvc.perform(bearer(endpoint, token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.adminId").value(adminId.toString()))
                .andExpect(jsonPath("$.data.probe").value("authorization"))
                .andExpect(jsonPath("$.error").isEmpty());
    }

    private User user(String label, Role role) {
        User user = userRepository.saveAndFlush(User.createSocial("admin-security-" + label + "@example.com", "회원" + label));
        if (role == Role.ADMIN) {
            changeRole(user.getId(), role);
            return userRepository.findById(user.getId()).orElseThrow();
        }
        return user;
    }

    private void changeRole(Long userId, Role role) {
        entityManager.createQuery("update User u set u.role = :role where u.id = :id")
                .setParameter("role", role).setParameter("id", userId).executeUpdate();
        flushAndClear();
    }

    private void flushAndClear() {
        entityManager.flush();
        entityManager.clear();
    }

    private String signedToken(String subject, String issuer, String role, boolean expired) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer(issuer).subject(subject)
                .issuedAt(expired ? now.minusSeconds(600) : now)
                .expiresAt(expired ? now.minusSeconds(300) : now.plusSeconds(300))
                .claim("role", role).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }

    private static MockHttpServletRequestBuilder bearer(Endpoint endpoint, String token) {
        return endpoint.request().header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
    }

    enum Endpoint {
        LIST(HttpMethod.GET, "/api/v1/admin/questions"),
        CREATE(HttpMethod.POST, "/api/v1/admin/questions"),
        UPDATE(HttpMethod.PATCH, "/api/v1/admin/questions/1"),
        DELETE(HttpMethod.DELETE, "/api/v1/admin/questions/1"),
        REVIEW(HttpMethod.PATCH, "/api/v1/admin/questions/1/review"),
        REPORTS(HttpMethod.GET, "/api/v1/admin/question-reports"),
        HANDLE_REPORT(HttpMethod.PATCH, "/api/v1/admin/question-reports/1");

        private final HttpMethod method;
        private final String path;

        Endpoint(HttpMethod method, String path) {
            this.method = method;
            this.path = path;
        }

        MockHttpServletRequestBuilder request() {
            return MockMvcRequestBuilders.request(method, path);
        }
    }

    /** 테스트 컨텍스트에서만 인가와 모듈 진입 검사를 실행한다. 업무 API 구현이 아니다. */
    @TestComponent
    @RestController
    static class ProbeController {

        @GetMapping("/api/v1/admin/questions")
        ApiResponse<Map<String, String>> list(Principal principal) {
            return probe(principal);
        }

        @PostMapping("/api/v1/admin/questions")
        ApiResponse<Map<String, String>> create(Principal principal) {
            return probe(principal);
        }

        @PatchMapping("/api/v1/admin/questions/{questionId}")
        ApiResponse<Map<String, String>> update(Principal principal) {
            return probe(principal);
        }

        @DeleteMapping("/api/v1/admin/questions/{questionId}")
        ApiResponse<Map<String, String>> delete(Principal principal) {
            return probe(principal);
        }

        @PatchMapping("/api/v1/admin/questions/{questionId}/review")
        ApiResponse<Map<String, String>> review(Principal principal) {
            return probe(principal);
        }

        @GetMapping("/api/v1/admin/question-reports")
        ApiResponse<Map<String, String>> reports(Principal principal) {
            return probe(principal);
        }

        @PatchMapping("/api/v1/admin/question-reports/{reportId}")
        ApiResponse<Map<String, String>> handleReport(Principal principal) {
            return probe(principal);
        }

        private ApiResponse<Map<String, String>> probe(Principal principal) {
            AdminQuestionActor admin = AdminQuestionAuthentication.requireAdmin(principal);
            return ApiResponse.ok(Map.of("adminId", Long.toString(admin.userId()), "probe", "authorization"));
        }
    }
}
