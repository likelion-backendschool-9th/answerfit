package com.likelion.answerfit.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.likelion.answerfit.global.exception.CustomException;
import com.likelion.answerfit.global.exception.ErrorCode;
import com.likelion.answerfit.user.dto.MemberResponse;
import com.likelion.answerfit.user.entity.Role;
import com.likelion.answerfit.user.entity.User;
import com.likelion.answerfit.user.repository.UserRepository;

class MemberServiceImplTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final MemberService memberService = new MemberServiceImpl(userRepository);

    @Test
    void 회원의_이메일_닉네임_역할을_돌려준다() {
        User admin = User.createSocial("admin@answerfit.kr", "운영자");
        ReflectionTestUtils.setField(admin, "role", Role.ADMIN);
        when(userRepository.findActiveById(1L)).thenReturn(Optional.of(User.createSocial("jiwoo@kakao.com", "지우")));
        when(userRepository.findActiveById(2L)).thenReturn(Optional.of(admin));

        assertThat(memberService.getMe(1L)).isEqualTo(new MemberResponse("jiwoo@kakao.com", "지우", "member"));
        assertThat(memberService.getMe(2L).role()).isEqualTo("admin");
    }

    @Test
    void 탈퇴했거나_없는_회원은_UNAUTHORIZED() {
        when(userRepository.findActiveById(7L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> memberService.getMe(7L))
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode()).isEqualTo(ErrorCode.UNAUTHORIZED));
    }
}
