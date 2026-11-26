package com.likelion.answerfit.user.entity;

import java.time.Instant;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.util.Assert;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

// 이메일·닉네임 유니크는 "탈퇴 회원 제외(+이메일 대소문자 무시)" 부분 인덱스라 @Table로 표현할 수 없어 DDL에서 관리한다.
@Entity
@Table(name = "users")
@SQLRestriction("deleted_at IS NULL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", nullable = false, length = 255)
    private String email;

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Column(name = "nickname", nullable = false, length = 30)
    private String nickname;

    @Column(name = "profile_image_key", length = 500)
    private String profileImageKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private UserStatus status;

    @Column(name = "suspended_at")
    private Instant suspendedAt;

    @Column(name = "suspended_reason", length = 500)
    private String suspendedReason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    private User(String email, String passwordHash, String nickname) {
        Assert.hasText(email, "이메일은 필수입니다.");
        Assert.hasText(nickname, "닉네임은 필수입니다.");
        this.email = email;
        this.passwordHash = passwordHash;
        this.nickname = nickname;
        this.role = Role.USER;
        this.status = UserStatus.ACTIVE;
    }

    public static User createLocal(String email, String passwordHash, String nickname) {
        Assert.hasText(passwordHash, "로컬 가입은 비밀번호가 필수입니다.");
        return new User(email, passwordHash, nickname);
    }

    // 소셜 전용 가입자는 password_hash가 NULL
    public static User createSocial(String email, String nickname) {
        return new User(email, null, nickname);
    }

    public void changeNickname(String nickname) {
        Assert.hasText(nickname, "닉네임은 필수입니다.");
        this.nickname = nickname;
    }

    // null이면 기본 로고로 되돌린다.
    public void changeProfileImage(String profileImageKey) {
        this.profileImageKey = profileImageKey;
    }

    public void changePassword(String passwordHash) {
        Assert.hasText(passwordHash, "비밀번호는 필수입니다.");
        this.passwordHash = passwordHash;
    }

    public void suspend(String reason) {
        Assert.state(status == UserStatus.ACTIVE, "정상 회원만 이용 정지할 수 있습니다.");
        this.status = UserStatus.SUSPENDED;
        this.suspendedAt = Instant.now();
        this.suspendedReason = reason;
    }

    public void activate() {
        Assert.state(status == UserStatus.SUSPENDED, "이용 정지된 회원만 해제할 수 있습니다.");
        this.status = UserStatus.ACTIVE;
        this.suspendedAt = null;
        this.suspendedReason = null;
    }

    public void delete() {
        Assert.state(deletedAt == null, "이미 탈퇴한 회원입니다.");
        this.deletedAt = Instant.now();
    }
}
