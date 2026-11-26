package com.likelion.answerfit.user.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.likelion.answerfit.user.repository.UserRepository;

@Service
public class NicknameAvailabilityService {
    private final UserRepository users;

    public NicknameAvailabilityService(UserRepository users) {
        this.users = users;
    }

    @Transactional(readOnly = true)
    public boolean isAvailable(String nickname) {
        return !users.existsByNickname(nickname);
    }
}
