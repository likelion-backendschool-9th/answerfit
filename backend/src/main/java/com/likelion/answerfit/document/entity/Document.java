package com.likelion.answerfit.document.entity;

import java.time.Instant;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLRestriction;
import org.springframework.util.Assert;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "documents", indexes = @Index(name = "idx_documents_user_id", columnList = "user_id"))
@SQLRestriction("deleted_at IS NULL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "doc_type", nullable = false, length = 30)
    private DocType docType;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 10)
    private SourceType sourceType;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "file_key", length = 500)
    private String fileKey;

    @Column(name = "original_filename", length = 255)
    private String originalFilename;

    @Column(name = "source_url", length = 1000)
    private String sourceUrl;

    @Column(name = "extracted_text", columnDefinition = "text")
    private String extractedText;

    @Enumerated(EnumType.STRING)
    @Column(name = "extract_status", nullable = false, length = 20)
    private ExtractStatus extractStatus;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "competency_status", length = 20)
    private CompetencyStatus competencyStatus;

    // TODO(ERD): user_id 주석·기획문서는 서류를 여러 서류 그룹에서 재사용(N:M)한다고 하지만 DDL은 서류당 그룹 1개(N:1, NOT NULL). 연결 테이블 필요 여부 확인 (docs/backend/document/README.md)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_groups_id", nullable = false)
    private DocumentGroup documentGroup;

    private Document(Long userId, DocumentGroup documentGroup, DocType docType, SourceType sourceType, String title) {
        Assert.notNull(userId, "회원 ID는 필수입니다.");
        Assert.notNull(documentGroup, "서류 그룹은 필수입니다.");
        Assert.notNull(docType, "서류 종류는 필수입니다.");
        Assert.hasText(title, "서류 제목은 필수입니다.");
        this.userId = userId;
        this.documentGroup = documentGroup;
        this.docType = docType;
        this.sourceType = sourceType;
        this.title = title;
        this.extractStatus = ExtractStatus.PENDING;
        // (CHECK) 역량 추출 상태는 JD에만 있다.
        this.competencyStatus = docType == DocType.JOB_DESCRIPTION ? CompetencyStatus.PENDING : null;
    }

    public static Document createFromFile(Long userId, DocumentGroup documentGroup, DocType docType, String title,
                                          String fileKey, String originalFilename) {
        Assert.hasText(fileKey, "FILE 서류는 파일 키가 필수입니다.");
        Document document = new Document(userId, documentGroup, docType, SourceType.FILE, title);
        document.fileKey = fileKey;
        document.originalFilename = originalFilename;
        return document;
    }

    public static Document createFromUrl(Long userId, DocumentGroup documentGroup, DocType docType, String title,
                                         String sourceUrl) {
        Assert.hasText(sourceUrl, "URL 서류는 링크가 필수입니다.");
        Document document = new Document(userId, documentGroup, docType, SourceType.URL, title);
        document.sourceUrl = sourceUrl;
        return document;
    }

    // 붙여 넣은 원문이 곧 추출 결과라 바로 SUCCESS로 시작한다.
    public static Document createFromText(Long userId, DocumentGroup documentGroup, DocType docType, String title,
                                          String text) {
        Assert.hasText(text, "TEXT 서류는 본문이 필수입니다.");
        Document document = new Document(userId, documentGroup, docType, SourceType.TEXT, title);
        document.extractedText = text;
        document.extractStatus = ExtractStatus.SUCCESS;
        return document;
    }

    public void completeExtraction(String extractedText) {
        Assert.state(extractStatus == ExtractStatus.PENDING, "추출 대기 중인 서류만 결과를 기록할 수 있습니다.");
        Assert.hasText(extractedText, "추출한 본문은 필수입니다.");
        this.extractedText = extractedText;
        this.extractStatus = ExtractStatus.SUCCESS;
    }

    public void failExtraction() {
        Assert.state(extractStatus == ExtractStatus.PENDING, "추출 대기 중인 서류만 실패로 바꿀 수 있습니다.");
        this.extractStatus = ExtractStatus.FAILED;
    }

    // FAILED에서 다시 시작하면 재시도
    public void startCompetencyExtraction() {
        Assert.state(competencyStatus == CompetencyStatus.PENDING || competencyStatus == CompetencyStatus.FAILED,
                "역량 추출을 시작할 수 없는 상태입니다.");
        this.competencyStatus = CompetencyStatus.RUNNING;
    }

    public void completeCompetencyExtraction() {
        Assert.state(competencyStatus == CompetencyStatus.RUNNING, "역량 추출 중인 서류만 완료할 수 있습니다.");
        this.competencyStatus = CompetencyStatus.DONE;
    }

    public void failCompetencyExtraction() {
        Assert.state(competencyStatus == CompetencyStatus.RUNNING, "역량 추출 중인 서류만 실패로 바꿀 수 있습니다.");
        this.competencyStatus = CompetencyStatus.FAILED;
    }

    public void rename(String title) {
        Assert.hasText(title, "서류 제목은 필수입니다.");
        this.title = title;
    }

    public void delete() {
        Assert.state(deletedAt == null, "이미 삭제된 서류입니다.");
        this.deletedAt = Instant.now();
    }
}
