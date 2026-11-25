package com.likelion.answerfit.pt.entity;

import java.time.Instant;

import org.springframework.util.Assert;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "pt_articles", uniqueConstraints = @UniqueConstraint(name = "uk_pt_articles_source_url", columnNames = "source_url"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PtArticle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", nullable = false, length = 300)
    private String title;

    @Column(name = "summary", columnDefinition = "text")
    private String summary;

    @Column(name = "source_url", nullable = false, length = 1000)
    private String sourceUrl;

    @Column(name = "publisher", length = 100)
    private String publisher;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "fetched_at", nullable = false)
    private Instant fetchedAt;

    @Builder
    private PtArticle(String title, String summary, String sourceUrl, String publisher, Instant publishedAt) {
        Assert.hasText(title, "기사 제목은 필수입니다.");
        Assert.hasText(sourceUrl, "기사 링크는 필수입니다.");
        this.title = title;
        this.summary = summary;
        this.sourceUrl = sourceUrl;
        this.publisher = publisher;
        this.publishedAt = publishedAt;
        this.fetchedAt = Instant.now();
    }
}
