package com.likelion.answerfit.question.auth;

import java.security.Principal;
import java.time.Instant;

import com.likelion.answerfit.user.entity.Role;
import com.likelion.answerfit.user.entity.UserStatus;

/** 인증 처리가 검증한 회원 정보를 문제은행에 전달하는 계약이다. */
public interface QuestionPrincipal extends Principal {

    Long userId();

    Role role();

    UserStatus status();

    Instant deletedAt();

    @Override
    default String getName() {
        return String.valueOf(userId());
    }
}
