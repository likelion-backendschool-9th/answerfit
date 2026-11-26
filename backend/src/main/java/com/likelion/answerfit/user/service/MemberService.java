package com.likelion.answerfit.user.service;

import com.likelion.answerfit.user.dto.MemberResponse;

public interface MemberService {

    /** 토큰은 맞지만 탈퇴한 회원이면 로그인하지 않은 것으로 보고 UNAUTHORIZED를 던진다 */
    MemberResponse getMe(Long userId);
}
