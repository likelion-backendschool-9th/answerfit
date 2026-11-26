package com.likelion.answerfit.question.auth;

import java.time.Instant;
import java.util.Collection;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import com.likelion.answerfit.user.entity.Role;
import com.likelion.answerfit.user.entity.UserStatus;

/** Jwt principal은 유지하고, 검증 시점의 회원 상태만 불변 값으로 전달한다. */
public final class QuestionJwtAuthenticationToken extends JwtAuthenticationToken implements QuestionPrincipal {

    private static final long serialVersionUID = 1L;

    private final Long userId;
    private final Role role;
    private final UserStatus status;
    private final Instant deletedAt;

    QuestionJwtAuthenticationToken(Jwt jwt, Collection<? extends GrantedAuthority> authorities,
            Long userId, Role role, UserStatus status, Instant deletedAt) {
        super(jwt, authorities);
        this.userId = userId;
        this.role = role;
        this.status = status;
        this.deletedAt = deletedAt;
    }

    @Override
    public Long userId() {
        return userId;
    }

    @Override
    public Role role() {
        return role;
    }

    @Override
    public UserStatus status() {
        return status;
    }

    @Override
    public Instant deletedAt() {
        return deletedAt;
    }
}
