package com.likelion.answerfit.auth.jwt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;

import javax.crypto.SecretKey;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.test.util.ReflectionTestUtils;

import com.likelion.answerfit.user.entity.User;

class TokenServiceTest {

    private final JwtConfig config = new JwtConfig();
    private final SecretKey key = JwtConfig.signingKey("a".repeat(JwtConfig.MIN_SECRET_BYTES));
    private final TokenService tokenService = new TokenService(config.jwtEncoder(key));
    private final JwtDecoder decoder = config.jwtDecoder(key);

    @Test
    void 회원_id와_역할을_담은_토큰을_발급한다() {
        User user = User.createSocial("jiwoo@kakao.com", "지우");
        ReflectionTestUtils.setField(user, "id", 7L);

        Jwt jwt = decoder.decode(tokenService.issue(user));

        assertThat(jwt.getSubject()).isEqualTo("7");
        assertThat(jwt.getClaimAsString("role")).isEqualTo("USER");
        assertThat(Duration.between(jwt.getIssuedAt(), jwt.getExpiresAt())).isEqualTo(TokenService.ACCESS_TOKEN_TTL);
    }

    @Test
    void 다른_키로_서명한_토큰은_받지_않는다() {
        User user = User.createSocial("jiwoo@kakao.com", "지우");
        ReflectionTestUtils.setField(user, "id", 7L);
        SecretKey other = JwtConfig.signingKey("b".repeat(JwtConfig.MIN_SECRET_BYTES));
        String forged = new TokenService(config.jwtEncoder(other)).issue(user);

        assertThatThrownBy(() -> decoder.decode(forged)).isInstanceOf(JwtException.class);
    }

    @Test
    void 짧은_비밀키는_거절하고_없으면_임시_키를_만든다() {
        assertThatThrownBy(() -> JwtConfig.signingKey("short")).isInstanceOf(IllegalStateException.class);
        assertThat(JwtConfig.signingKey("").getEncoded()).hasSize(JwtConfig.MIN_SECRET_BYTES);
        assertThat(JwtConfig.signingKey(null).getEncoded()).isNotEqualTo(JwtConfig.signingKey(null).getEncoded());
    }
}
