package com.likelion.answerfit.question.entity;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.util.Assert;

import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "questions",
        indexes = {
                @Index(name = "idx_questions_status", columnList = "status"),
                @Index(name = "idx_questions_author_id", columnList = "author_id"),
                @Index(name = "idx_questions_category_id", columnList = "category_id")
        }
)
@SQLRestriction("deleted_at IS NULL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 인성 질문은 중분류가 없을 수 있어 카테고리와 별도로 대분류를 둔다.
    @Enumerated(EnumType.STRING)
    @Column(name = "major", nullable = false, length = 20)
    private QuestionMajor major;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(name = "content", nullable = false, columnDefinition = "text")
    private String content;

    @Column(name = "model_answer", columnDefinition = "text")
    private String modelAnswer;

    @Column(name = "hint", columnDefinition = "text")
    private String hint;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 10)
    private QuestionSource source;

    @Column(name = "author_id")
    private Long authorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private QuestionStatus status;

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "model_answer_status", length = 20)
    private ModelAnswerStatus modelAnswerStatus;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<QuestionKeyword> keywords = new ArrayList<>();

    private Question(QuestionMajor major, Category category, String content, QuestionSource source) {
        validateCategory(major, category);
        Assert.hasText(content, "질문 내용은 필수입니다.");
        this.major = major;
        this.category = category;
        this.content = content;
        this.source = source;
    }

    // 관리자 등록은 APPROVED로 시작하고, 등록자가 곧 검토자다. 모범답안은 직접 작성(model_answer_status NULL).
    public static Question createByAdmin(QuestionMajor major, Category category, String content,
                                         String modelAnswer, String hint, Long adminId) {
        Assert.notNull(adminId, "등록한 관리자 ID는 필수입니다.");
        Question question = new Question(major, category, content, QuestionSource.ADMIN);
        question.modelAnswer = modelAnswer;
        question.hint = hint;
        question.status = QuestionStatus.APPROVED;
        question.reviewedBy = adminId;
        question.reviewedAt = Instant.now();
        return question;
    }

    public static Question createByUser(QuestionMajor major, Category category, String content, Long authorId) {
        // (CHECK) 인성 질문은 관리자만 등록
        Assert.isTrue(major != QuestionMajor.PERSONALITY, "인성 질문은 관리자만 등록할 수 있습니다.");
        // (CHECK) USER 질문은 작성자 필수
        Assert.notNull(authorId, "작성자 ID는 필수입니다.");
        Question question = new Question(major, category, content, QuestionSource.USER);
        question.authorId = authorId;
        question.status = QuestionStatus.PENDING;
        return question;
    }

    // 승인 전(PENDING·REJECTED)에만 수정 가능. 반려된 질문을 고치면 재제출로 보고 PENDING으로 되돌린다.
    public void update(Category category, String content) {
        Assert.state(status == QuestionStatus.PENDING || status == QuestionStatus.REJECTED,
                "승인된 질문은 수정할 수 없습니다.");
        validateCategory(major, category);
        Assert.hasText(content, "질문 내용은 필수입니다.");
        this.category = category;
        this.content = content;
        if (status == QuestionStatus.REJECTED) {
            this.status = QuestionStatus.PENDING;
            this.reviewedBy = null;
            this.reviewedAt = null;
        }
    }

    public void delete() {
        Assert.state(status == QuestionStatus.PENDING || status == QuestionStatus.REJECTED,
                "승인된 질문은 삭제할 수 없습니다.");
        markDeleted();
    }

    // 관리자 문제 은행 CRUD: 상태와 무관하게 수정
    public void updateByAdmin(Category category, String content, String modelAnswer, String hint) {
        validateCategory(major, category);
        Assert.hasText(content, "질문 내용은 필수입니다.");
        this.category = category;
        this.content = content;
        this.modelAnswer = modelAnswer;
        this.hint = hint;
    }

    // 관리자 문제 은행 CRUD·신고 처리: 상태와 무관하게 삭제
    public void deleteByAdmin() {
        markDeleted();
    }

    // 승인하면 AI 모범답안 생성을 기다린다.
    public void approve(Long adminId) {
        Assert.state(status == QuestionStatus.PENDING, "승인 대기 중인 질문만 승인할 수 있습니다.");
        Assert.notNull(adminId, "관리자 ID는 필수입니다.");
        this.status = QuestionStatus.APPROVED;
        this.reviewedBy = adminId;
        this.reviewedAt = Instant.now();
        this.modelAnswerStatus = ModelAnswerStatus.PENDING;
    }

    // 반려 사유는 QuestionModeration(REJECT)에 기록한다.
    public void reject(Long adminId) {
        Assert.state(status == QuestionStatus.PENDING, "승인 대기 중인 질문만 반려할 수 있습니다.");
        Assert.notNull(adminId, "관리자 ID는 필수입니다.");
        this.status = QuestionStatus.REJECTED;
        this.reviewedBy = adminId;
        this.reviewedAt = Instant.now();
    }

    // 신고 조치 사유는 QuestionModeration(REPORT)에 기록한다.
    public void hide() {
        Assert.state(status == QuestionStatus.APPROVED, "승인된 질문만 숨길 수 있습니다.");
        this.status = QuestionStatus.HIDDEN;
    }

    public void completeModelAnswer(String modelAnswer) {
        Assert.state(modelAnswerStatus == ModelAnswerStatus.PENDING || modelAnswerStatus == ModelAnswerStatus.FAILED,
                "모범답안 생성을 기다리는 질문이 아닙니다.");
        Assert.hasText(modelAnswer, "모범답안은 필수입니다.");
        this.modelAnswer = modelAnswer;
        this.modelAnswerStatus = ModelAnswerStatus.DONE;
    }

    public void failModelAnswer() {
        Assert.state(modelAnswerStatus == ModelAnswerStatus.PENDING, "모범답안 생성 중인 질문이 아닙니다.");
        this.modelAnswerStatus = ModelAnswerStatus.FAILED;
    }

    // FAILED 후 재생성 요청
    public void retryModelAnswer() {
        Assert.state(modelAnswerStatus == ModelAnswerStatus.FAILED, "모범답안 생성에 실패한 질문만 재시도할 수 있습니다.");
        this.modelAnswerStatus = ModelAnswerStatus.PENDING;
    }

    public void addKeyword(String keyword) {
        Assert.isTrue(keywords.stream().noneMatch(k -> k.getKeyword().equals(keyword)), "이미 등록된 키워드입니다.");
        keywords.add(new QuestionKeyword(this, keyword, keywords.size()));
    }

    public void removeKeyword(String keyword) {
        keywords.removeIf(k -> k.getKeyword().equals(keyword));
    }

    public List<QuestionKeyword> getKeywords() {
        return Collections.unmodifiableList(keywords);
    }

    private void markDeleted() {
        Assert.state(deletedAt == null, "이미 삭제된 질문입니다.");
        this.deletedAt = Instant.now();
    }

    private static void validateCategory(QuestionMajor major, Category category) {
        Assert.notNull(major, "대분류는 필수입니다.");
        // (CHECK) CS 질문은 중분류 필수
        Assert.isTrue(major != QuestionMajor.CS || category != null, "CS 질문은 카테고리가 필수입니다.");
        // 복합 FK (category_id, major)와 같은 규칙: 대분류가 다른 카테고리는 쓸 수 없다.
        Assert.isTrue(category == null || category.getMajor() == major, "질문과 카테고리의 대분류가 다릅니다.");
    }
}
