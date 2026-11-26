package com.likelion.answerfit.question.entity;

import org.springframework.util.Assert;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(
        name = "categories",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_categories_major_name", columnNames = {"major", "name"}),
                // questions의 복합 FK (category_id, major) → (id, major) 대상
                @UniqueConstraint(name = "uk_categories_id_major", columnNames = {"id", "major"})
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "major", nullable = false, length = 20)
    private QuestionMajor major;

    @Column(name = "name", nullable = false, length = 50)
    private String name;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    @Builder
    private Category(QuestionMajor major, String name, Integer sortOrder) {
        Assert.notNull(major, "대분류는 필수입니다.");
        Assert.hasText(name, "중분류 이름은 필수입니다.");
        this.major = major;
        this.name = name;
        this.sortOrder = sortOrder == null ? 0 : sortOrder;
    }

    public void rename(String name) {
        Assert.hasText(name, "중분류 이름은 필수입니다.");
        this.name = name;
    }

    public void changeSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }
}
