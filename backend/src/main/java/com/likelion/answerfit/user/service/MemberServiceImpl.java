package com.likelion.answerfit.user.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.likelion.answerfit.global.error.ApiException;
import com.likelion.answerfit.global.error.ErrorCode;
import com.likelion.answerfit.user.dto.MemberResponse;
import com.likelion.answerfit.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemberServiceImpl implements MemberService {

    private final UserRepository userRepository;

    @Override
    public MemberResponse getMe(Long userId) {
        return userRepository.findActiveById(userId)
                .map(MemberResponse::from)
                .orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED));
    }
}
