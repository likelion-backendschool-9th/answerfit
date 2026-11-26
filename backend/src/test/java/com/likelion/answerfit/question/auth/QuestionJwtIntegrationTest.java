package com.likelion.answerfit.question.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.Base64;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import com.likelion.answerfit.auth.jwt.TokenService;
import com.likelion.answerfit.auth.kakao.KakaoClient;
import com.likelion.answerfit.auth.kakao.KakaoUser;
import com.likelion.answerfit.global.exception.ErrorCode;
import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.Question;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.user.entity.Role;
import com.likelion.answerfit.user.entity.User;
import com.likelion.answerfit.user.entity.UserStatus;
import com.likelion.answerfit.user.repository.UserRepository;

import jakarta.persistence.EntityManager;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(properties = {
        "answerfit.jwt.secret=question-jwt-integration-test-secret-at-least-32-bytes",
        "answerfit.question.seed-enabled=true"})
@AutoConfigureMockMvc(addFilters = true)
@Transactional
class QuestionJwtIntegrationTest {

    private static final String CATEGORIES = "/api/v1/categories";
    private static final String QUESTIONS = "/api/v1/learning/questions";
    private static final String ME = "/api/v1/members/me";

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

    @Autowired
    private JwtDecoder jwtDecoder;

    @Autowired
    private QuestionJwtAuthenticationConverter converter;

    @Autowired
    private JsonMapper jsonMapper;

    // 카카오 네트워크 경계만 대체한다. 로그인·회원 저장·JWT 서명/검증·보안 필터는 실제 빈이다.
    @MockitoBean
    private KakaoClient kakaoClient;

    @Test
    void 카카오_로그인이_발급한_실제_JWT로_회원과_문제은행을_연속_조회한다() throws Exception {
        Question question = publicQuestion();
        when(kakaoClient.fetchUser("jwt-flow-code", "http://localhost:3000/oauth/kakao/redirect"))
                .thenReturn(new KakaoUser("jwt-flow-account", "jwt-kakao@example.com", true, "JWT회원"));

        var login = mockMvc.perform(post("/api/v1/auth/social/kakao")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"jwt-flow-code\",\"redirectUri\":\"http://localhost:3000/oauth/kakao/redirect\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isString())
                .andReturn();
        String token = jsonMapper.readTree(login.getResponse().getContentAsString()).path("data").path("accessToken").asText();
        assertThat(token).isNotBlank();
        Long userId = Long.valueOf(jwtDecoder.decode(token).getSubject());
        assertThat(userRepository.findActiveById(userId)).isPresent();
        assertThat(userRepository.existsByEmailIgnoreCase("jwt-kakao@example.com")).isTrue();
        flushAndClear();

        mockMvc.perform(bearer(get(ME), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("jwt-kakao@example.com"))
                .andExpect(jsonPath("$.data.nickname").value("JWT회원"))
                .andExpect(jsonPath("$.data.role").value("member"))
                .andExpect(jsonPath("$.email").doesNotExist());
        mockMvc.perform(bearer(get(CATEGORIES), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.majors[0].major").value("CS"))
                .andExpect(jsonPath("$.success").doesNotExist());
        mockMvc.perform(bearer(get(QUESTIONS).param("major", "CS"), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(question.getId().toString()))
                .andExpect(jsonPath("$.totalCount").value(1))
                .andExpect(jsonPath("$.success").doesNotExist());
        mockMvc.perform(bearer(get(QUESTIONS + "/{id}", question.getId()), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(question.getId().toString()))
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.modelAnswer").value("JWT 연결을 확인하는 모범답안입니다."))
                .andExpect(jsonPath("$.success").doesNotExist());
        verify(kakaoClient).fetchUser("jwt-flow-code", "http://localhost:3000/oauth/kakao/redirect");
        verifyNoMoreInteractions(kakaoClient);
    }

    @Test
    void 실제_회원_토큰의_subject로_본인_미승인_상세를_구분하고_임의_신원은_무시한다() throws Exception {
        User owner = user("owner");
        User other = user("other");
        Question pending = Question.createByUser(QuestionMajor.CS, category(), "실제 JWT의 소유권을 확인하는 질문입니다.", owner.getId());
        entityManager.persist(pending);
        String ownerToken = tokenService.issue(owner);
        String otherToken = tokenService.issue(other);
        flushAndClear();

        mockMvc.perform(bearer(get(QUESTIONS + "/{id}", pending.getId())
                        .header("X-User-Id", other.getId()).param("userId", other.getId().toString()), ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.isMine").value(true))
                .andExpect(jsonPath("$.canEdit").value(true));
        mockMvc.perform(bearer(get(QUESTIONS + "/{id}", pending.getId())
                        .header("X-User-Id", owner.getId()).param("userId", owner.getId().toString()), otherToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("QUESTION_NOT_FOUND"))
                .andExpect(jsonPath("$.success").doesNotExist());
    }

    @ParameterizedTest
    @EnumSource(Role.class)
    void 서명된_JWT의_권한_클레임보다_DB의_현재_권한을_사용한다(Role databaseRole) throws Exception {
        User user = user("role");
        Role tokenRole = databaseRole == Role.USER ? Role.ADMIN : Role.USER;
        String token = signedToken(user.getId().toString(), TokenService.ISSUER, tokenRole.name(), false);
        entityManager.createQuery("update User u set u.role = :role where u.id = :id")
                .setParameter("role", databaseRole).setParameter("id", user.getId()).executeUpdate();
        flushAndClear();

        var authentication = converter.convert(jwtDecoder.decode(token));
        assertThat(authentication.getPrincipal()).isInstanceOf(org.springframework.security.oauth2.jwt.Jwt.class);
        assertThat(authentication).isInstanceOfSatisfying(QuestionPrincipal.class, principal -> {
            assertThat(principal.userId()).isEqualTo(user.getId());
            assertThat(principal.role()).isEqualTo(databaseRole);
            assertThat(principal.status()).isEqualTo(UserStatus.ACTIVE);
        });
        mockMvc.perform(bearer(get(ME), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value(databaseRole == Role.ADMIN ? "admin" : "member"));
        mockMvc.perform(bearer(get(CATEGORIES), token)).andExpect(status().isOk());
    }

    @Test
    void 발급_후_이용정지된_회원은_문제은행에서_현재_DB_상태로_403을_받는다() throws Exception {
        User user = user("suspended");
        String token = tokenService.issue(user);
        flushAndClear();
        mockMvc.perform(bearer(get(CATEGORIES), token)).andExpect(status().isOk());

        userRepository.findById(user.getId()).orElseThrow().suspend("테스트 이용 정지");
        flushAndClear();

        mockMvc.perform(bearer(get(QUESTIONS), token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"))
                .andExpect(jsonPath("$.message").value("이 요청을 처리할 권한이 없습니다."))
                .andExpect(jsonPath("$.success").doesNotExist());
    }

    @Test
    void 발급_후_탈퇴한_회원은_같은_토큰으로도_필터에서_401을_받는다() throws Exception {
        User user = user("deleted");
        String token = tokenService.issue(user);
        flushAndClear();
        mockMvc.perform(bearer(get(CATEGORIES), token)).andExpect(status().isOk());

        userRepository.findById(user.getId()).orElseThrow().delete();
        flushAndClear();

        assertUnauthorized(token);
    }

    @Test
    void 서명은_유효해도_존재하지_않는_회원의_토큰은_401이다() throws Exception {
        assertUnauthorized(signedToken(Long.toString(Long.MAX_VALUE), TokenService.ISSUER, "USER", false));
    }

    @Test
    void 토큰이_없는_요청은_전역_인증_오류_형식으로_401이다() throws Exception {
        assertUnauthorized(null);
    }

    @Test
    void 정상_발급된_토큰의_서명을_변조하면_401이다() throws Exception {
        User user = user("signature");
        String token = tokenService.issue(user);
        flushAndClear();
        String[] sections = token.split("\\.");
        byte[] signature = Base64.getUrlDecoder().decode(sections[2]);
        signature[0] ^= 1;
        String forged = sections[0] + "." + sections[1] + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(signature);

        assertUnauthorized(forged);
    }

    @ParameterizedTest
    @ValueSource(strings = {"EXPIRED", "WRONG_ISSUER"})
    void 만료되거나_발급자가_다른_실제_서명_토큰은_401이다(String scenario) throws Exception {
        User user = user("claims");
        flushAndClear();
        boolean expired = scenario.equals("EXPIRED");
        String issuer = expired ? TokenService.ISSUER : "other-service";

        assertUnauthorized(signedToken(user.getId().toString(), issuer, "USER", expired));
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "NaN", "9223372036854775808"})
    void 잘못된_subject는_서명이_유효해도_전역_401이다(String subject) throws Exception {
        assertUnauthorized(signedToken(subject, TokenService.ISSUER, "ADMIN", false));
    }

    private String signedToken(String subject, String issuer, String role, boolean expired) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer(issuer).subject(subject)
                .issuedAt(expired ? now.minusSeconds(600) : now)
                .expiresAt(expired ? now.minusSeconds(300) : now.plusSeconds(300))
                .claim("role", role).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }

    private void assertUnauthorized(String token) throws Exception {
        MockHttpServletRequestBuilder request = get(CATEGORIES);
        if (token != null) bearer(request, token);
        mockMvc.perform(request)
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.errorCode").value(ErrorCode.UNAUTHORIZED.getCode()))
                .andExpect(jsonPath("$.error.httpStatus").value(401))
                .andExpect(jsonPath("$.error.detail").value(ErrorCode.UNAUTHORIZED.getMessage()))
                .andExpect(jsonPath("$.code").doesNotExist())
                .andExpect(content().string(not(containsString("NumberFormatException"))));
    }

    private User user(String label) {
        return userRepository.saveAndFlush(User.createSocial("jwt-" + label + "@example.com", "회원" + label));
    }

    private Question publicQuestion() {
        Question question = Question.createByAdmin(QuestionMajor.CS, category(), "실제 JWT로 조회하는 공개 질문입니다.",
                "JWT 연결을 확인하는 모범답안입니다.", null, 99L);
        entityManager.persist(question);
        flushAndClear();
        return question;
    }

    private Category category() {
        return entityManager.createQuery("select c from Category c where c.major = :major and c.name = :name", Category.class)
                .setParameter("major", QuestionMajor.CS).setParameter("name", "운영체제").getSingleResult();
    }

    private void flushAndClear() {
        entityManager.flush();
        entityManager.clear();
    }

    private static MockHttpServletRequestBuilder bearer(MockHttpServletRequestBuilder request, String token) {
        return request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
    }
}
