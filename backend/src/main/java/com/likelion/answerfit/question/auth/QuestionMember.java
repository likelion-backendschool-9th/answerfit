package com.likelion.answerfit.question.auth;

import java.util.Objects;

import com.likelion.answerfit.user.entity.Role;

/** 계정 접근 검사를 통과한 회원. HTTP 요청 본문으로 바인딩하지 않는다. */
public record QuestionMember(long userId, Role role) {

    public QuestionMember {
        if (userId <= 0) {
            throw new IllegalArgumentException("회원 ID는 양수여야 합니다.");
        }
        Objects.requireNonNull(role, "회원 권한은 필수입니다.");
    }
}
