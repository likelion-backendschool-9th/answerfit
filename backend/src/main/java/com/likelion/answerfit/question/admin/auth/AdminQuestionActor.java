package com.likelion.answerfit.question.admin.auth;

/** 현재 DB의 관리자 권한과 계정 상태를 확인한 호출자. 요청 본문으로 바인딩하지 않는다. */
public record AdminQuestionActor(long userId) {

    public AdminQuestionActor {
        if (userId <= 0) {
            throw new IllegalArgumentException("관리자 ID는 양수여야 합니다.");
        }
    }
}
