package com.likelion.answerfit.question.auth;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.likelion.answerfit.user.entity.User;
import com.likelion.answerfit.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

/** 공통 JWT 검증 후 현재 회원 정보를 질문 권한 계약에 연결한다. */
@Component
@RequiredArgsConstructor
public class QuestionJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserRepository userRepository;
    private final JwtGrantedAuthoritiesConverter authoritiesConverter = new JwtGrantedAuthoritiesConverter();

    @Override
    @Transactional(readOnly = true)
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Long userId = readUserId(jwt.getSubject());
        User user = userRepository.findActiveById(userId)
                .orElseThrow(QuestionJwtAuthenticationConverter::invalidToken);
        if (user.getId() == null || !userId.equals(user.getId())
                || user.getRole() == null || user.getStatus() == null || user.getDeletedAt() != null) {
            throw invalidToken();
        }
        // role 클레임 대신 DB 값을 사용한다. 정지 상태는 질문의 기존 인증 경계가 403으로 처리한다.
        return new QuestionJwtAuthenticationToken(jwt, authoritiesConverter.convert(jwt),
                user.getId(), user.getRole(), user.getStatus(), user.getDeletedAt());
    }

    private static Long readUserId(String subject) {
        if (subject == null || !subject.matches("[1-9][0-9]*")) {
            throw invalidToken();
        }
        try {
            return Long.valueOf(subject);
        } catch (NumberFormatException exception) {
            throw invalidToken();
        }
    }

    private static InvalidBearerTokenException invalidToken() {
        return new InvalidBearerTokenException("인증 정보를 확인할 수 없습니다.");
    }
}
