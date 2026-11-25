package com.likelion.answerfit.document.entity;

import java.time.Instant;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.util.Assert;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "document_groups", indexes = @Index(name = "idx_document_groups_user_id", columnList = "user_id"))
@SQLRestriction("deleted_at IS NULL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DocumentGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Builder
    private DocumentGroup(Long userId, String name) {
        Assert.notNull(userId, "회원 ID는 필수입니다.");
        Assert.hasText(name, "서류 그룹 이름은 필수입니다.");
        this.userId = userId;
        this.name = name;
    }

    public void rename(String name) {
        Assert.hasText(name, "서류 그룹 이름은 필수입니다.");
        this.name = name;
    }

    public void delete() {
        Assert.state(deletedAt == null, "이미 삭제된 서류 그룹입니다.");
        this.deletedAt = Instant.now();
    }
}
