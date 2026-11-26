package com.likelion.answerfit.user.dto;

import com.likelion.answerfit.user.entity.Role;
import com.likelion.answerfit.user.entity.User;

/** 프론트 Session 형식. role은 "member" 또는 "admin" */
public record MemberResponse(String email, String nickname, String role) {

    public static MemberResponse from(User user) {
        return new MemberResponse(user.getEmail(), user.getNickname(), user.getRole() == Role.ADMIN ? "admin" : "member");
    }
}
