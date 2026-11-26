package com.likelion.answerfit.document.entity;

import java.time.Instant;

import org.hibernate.annotations.CreationTimestamp;
import org.springframework.util.Assert;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "document_competencies")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DocumentCompetency {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "evidence", columnDefinition = "text")
    private String evidence;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "documents_id", nullable = false)
    private Document document;

    @Builder
    private DocumentCompetency(Document document, String name, String description, String evidence, Integer sortOrder) {
        Assert.notNull(document, "서류는 필수입니다.");
        Assert.hasText(name, "역량 이름은 필수입니다.");
        Assert.notNull(sortOrder, "정렬 순서는 필수입니다.");
        this.document = document;
        this.name = name;
        this.description = description;
        this.evidence = evidence;
        this.sortOrder = sortOrder;
    }
}
