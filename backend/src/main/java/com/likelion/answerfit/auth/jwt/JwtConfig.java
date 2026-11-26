package com.likelion.answerfit.auth.jwt;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import com.nimbusds.jose.jwk.source.ImmutableSecret;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Configuration
public class JwtConfig {

    /** HS256은 32바이트 이상의 키가 필요하다 */
    static final int MIN_SECRET_BYTES = 32;

    @Bean
    public SecretKey jwtSigningKey(@Value("${answerfit.jwt.secret:}") String secret) {
        return signingKey(secret);
    }

    // 로그인을 다루지 않는 팀원도 설정 없이 서버를 켤 수 있게, 키가 없으면 임시 키를 만든다. 서버를 다시 켜면 모든 토큰이 무효가 된다.
    static SecretKey signingKey(String secret) {
        byte[] bytes;
        if (secret == null || secret.isBlank()) {
            log.warn("JWT_SECRET이 없어 임시 키로 토큰을 서명합니다. 서버를 다시 켜면 로그인이 풀립니다.");
            bytes = new byte[MIN_SECRET_BYTES];
            new SecureRandom().nextBytes(bytes);
        } else {
            bytes = secret.getBytes(StandardCharsets.UTF_8);
            if (bytes.length < MIN_SECRET_BYTES) {
                throw new IllegalStateException("JWT_SECRET은 " + MIN_SECRET_BYTES + "바이트 이상이어야 합니다.");
            }
        }
        return new SecretKeySpec(bytes, "HmacSHA256");
    }

    @Bean
    public JwtEncoder jwtEncoder(SecretKey jwtSigningKey) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(jwtSigningKey));
    }

    @Bean
    public JwtDecoder jwtDecoder(SecretKey jwtSigningKey) {
        return NimbusJwtDecoder.withSecretKey(jwtSigningKey).macAlgorithm(MacAlgorithm.HS256).build();
    }
}
