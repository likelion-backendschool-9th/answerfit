package com.likelion.answerfit.user.entity;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user_profile_images")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserProfileImage {
    @Id
    @Column(length = 36)
    private String imageKey;

    @Column(nullable = false, length = 32)
    private String mediaType;

    @JdbcTypeCode(SqlTypes.VARBINARY)
    @Column(nullable = false, length = 5 * 1024 * 1024)
    private byte[] contents;

    public UserProfileImage(String imageKey, String mediaType, byte[] contents) {
        this.imageKey = imageKey;
        this.mediaType = mediaType;
        this.contents = contents.clone();
    }
}
