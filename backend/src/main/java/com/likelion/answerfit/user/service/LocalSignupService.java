package com.likelion.answerfit.user.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.UUID;

import javax.imageio.ImageIO;

import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.likelion.answerfit.global.exception.CustomException;
import com.likelion.answerfit.global.exception.ErrorCode;
import com.likelion.answerfit.user.entity.User;
import com.likelion.answerfit.user.entity.UserProfileImage;
import com.likelion.answerfit.user.repository.UserProfileImageRepository;
import com.likelion.answerfit.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LocalSignupService {
    private final UserRepository users;
    private final UserProfileImageRepository images;
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder();

    @Transactional(readOnly = true)
    public boolean isEmailAvailable(String email) {
        return !users.existsByEmailIgnoreCase(email.strip());
    }

    @Transactional
    public void register(String email, String password, String nickname, RequiredConsents consents, MultipartFile photo) {
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
        User user = User.createLocal(normalizedEmail, passwords.encode(password), nickname);
        if (photo != null && !photo.isEmpty()) {
            user.changeProfileImage(storePhoto(photo));
        }
        try {
            users.saveAndFlush(user);
        } catch (DataIntegrityViolationException exception) {
            if (exception.getCause() instanceof ConstraintViolationException violation) {
                String constraint = violation.getConstraintName();
                if ("users_active_email_uq".equals(constraint)) {
                    throw new CustomException(ErrorCode.DUPLICATE_EMAIL);
                }
                if ("users_active_nickname_uq".equals(constraint)) {
                    throw new CustomException(ErrorCode.DUPLICATE_NICKNAME);
                }
            }
            throw exception;
        }
    }

    private String storePhoto(MultipartFile photo) {
        if (photo.getSize() > 5 * 1024 * 1024) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "프로필 사진은 5MB 이하로 올려 주세요.");
        }
        try (var contents = photo.getInputStream(); var input = ImageIO.createImageInputStream(contents)) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                throw new CustomException(ErrorCode.INVALID_INPUT, "JPG 또는 PNG 사진을 올려 주세요.");
            }
            var reader = readers.next();
            String format;
            try {
                reader.setInput(input);
                reader.getWidth(0);
                reader.getHeight(0);
                format = reader.getFormatName().toLowerCase(Locale.ROOT);
            } finally {
                reader.dispose();
            }
            if (!"jpeg".equals(format) && !"png".equals(format)) {
                throw new CustomException(ErrorCode.INVALID_INPUT, "JPG 또는 PNG 사진을 올려 주세요.");
            }
            String key = UUID.randomUUID().toString();
            images.save(new UserProfileImage(key, "image/" + format, photo.getBytes()));
            return key;
        } catch (IOException exception) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "프로필 사진을 읽을 수 없습니다.");
        }
    }

    public record RequiredConsents(boolean termsOfService, boolean privacyCollection, boolean interviewRecording) {}
}
