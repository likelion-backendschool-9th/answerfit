package com.likelion.answerfit.user.service;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.likelion.answerfit.global.exception.CustomException;
import com.likelion.answerfit.global.exception.ErrorCode;
import com.likelion.answerfit.user.entity.User;
import com.likelion.answerfit.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LocalSignupService {
    private final UserRepository users;
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder();

    @Transactional
    public void register(String email, String password, String nickname, RequiredConsents consents) {
        if (!consents.termsOfService() || !consents.privacyCollection() || !consents.interviewRecording()) {
            throw new CustomException(ErrorCode.REQUIRED_CONSENT_MISSING);
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        String normalizedEmail = email.strip().toLowerCase(Locale.ROOT);
        if (users.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new CustomException(ErrorCode.DUPLICATE_EMAIL);
        }
        if (users.existsByNickname(nickname)) {
            throw new CustomException(ErrorCode.DUPLICATE_NICKNAME);
        }
        users.save(User.createLocal(normalizedEmail, passwords.encode(password), nickname));
    }

    public record RequiredConsents(boolean termsOfService, boolean privacyCollection, boolean interviewRecording) {}
}
