package com.likelion.answerfit.question.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;

import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.Question;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.repository.projection.CategoryQuestionCount;
import com.likelion.answerfit.question.repository.projection.MajorQuestionCount;

@DataJpaTest
class CategoryRepositoryTest {

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void 질문이_없는_카테고리도_0건으로_반환한다() {
        Category category = category(QuestionMajor.CS, "운영체제", 10);
        flushAndClear();

        assertThat(categoryRepository.findAllWithPublicQuestionCount())
                .containsExactly(new CategoryQuestionCount(category.getId(), QuestionMajor.CS, "운영체제", 10, 0));
        assertThat(categoryRepository.countPublicQuestionsByMajor()).isEmpty();
    }

    @Test
    void 공개된_질문만_세고_답안_생성_대기와_실패는_포함한다() {
        Category category = category(QuestionMajor.CS, "운영체제", 10);
        adminQuestion(QuestionMajor.CS, category);

        Question generating = userQuestion(category);
        generating.approve(99L);

        Question failed = userQuestion(category);
        failed.approve(99L);
        failed.failModelAnswer();

        userQuestion(category);

        Question rejected = userQuestion(category);
        rejected.reject(99L);

        Question hidden = adminQuestion(QuestionMajor.CS, category);
        hidden.hide();

        Question deleted = adminQuestion(QuestionMajor.CS, category);
        deleted.deleteByAdmin();
        flushAndClear();

        assertThat(categoryRepository.findAllWithPublicQuestionCount())
                .extracting(CategoryQuestionCount::questionCount)
                .containsExactly(3L);
        assertThat(categoryRepository.countPublicQuestionsByMajor())
                .containsExactly(new MajorQuestionCount(QuestionMajor.CS, 3));
    }

    @Test
    void 비공개_질문만_있는_카테고리를_조회에서_누락하지_않는다() {
        Category category = category(QuestionMajor.CS, "네트워크", 10);
        userQuestion(category);
        Question hidden = adminQuestion(QuestionMajor.CS, category);
        hidden.hide();
        Question deleted = adminQuestion(QuestionMajor.CS, category);
        deleted.deleteByAdmin();
        flushAndClear();

        assertThat(categoryRepository.findAllWithPublicQuestionCount())
                .containsExactly(new CategoryQuestionCount(category.getId(), QuestionMajor.CS, "네트워크", 10, 0));
    }

    @Test
    void 대분류와_표시순서로_정렬하고_표시순서가_같으면_ID로_정렬한다() {
        Category personality = category(QuestionMajor.PERSONALITY, "협업", 0);
        Category later = category(QuestionMajor.CS, "데이터베이스", 20);
        Category earlier = category(QuestionMajor.CS, "운영체제", 10);
        Category sameOrder = category(QuestionMajor.CS, "네트워크", 10);
        flushAndClear();

        assertThat(categoryRepository.findAllWithPublicQuestionCount())
                .extracting(CategoryQuestionCount::id, CategoryQuestionCount::sortOrder)
                .containsExactly(tuple(earlier.getId(), 10), tuple(sameOrder.getId(), 10),
                        tuple(later.getId(), 20), tuple(personality.getId(), 0));
    }

    @Test
    void 중분류가_없는_인성_질문도_대분류_공개_건수에_포함한다() {
        Category cs = category(QuestionMajor.CS, "운영체제", 10);
        Category personality = category(QuestionMajor.PERSONALITY, "협업", 10);
        adminQuestion(QuestionMajor.CS, cs);
        adminQuestion(QuestionMajor.PERSONALITY, personality);
        adminQuestion(QuestionMajor.PERSONALITY, null);
        Question hidden = adminQuestion(QuestionMajor.PERSONALITY, null);
        hidden.hide();
        Question deleted = adminQuestion(QuestionMajor.PERSONALITY, null);
        deleted.deleteByAdmin();
        flushAndClear();

        assertThat(categoryRepository.countPublicQuestionsByMajor())
                .containsExactly(new MajorQuestionCount(QuestionMajor.CS, 1),
                        new MajorQuestionCount(QuestionMajor.PERSONALITY, 2));
        assertThat(categoryRepository.findAllWithPublicQuestionCount())
                .extracting(CategoryQuestionCount::major, CategoryQuestionCount::questionCount)
                .containsExactly(tuple(QuestionMajor.CS, 1L), tuple(QuestionMajor.PERSONALITY, 1L));
    }

    @Test
    void 같은_이름의_카테고리도_대분류별로_구분한다() {
        category(QuestionMajor.CS, "공통", 10);
        flushAndClear();

        assertThat(categoryRepository.existsByMajorAndName(QuestionMajor.CS, "공통")).isTrue();
        assertThat(categoryRepository.existsByMajorAndName(QuestionMajor.PERSONALITY, "공통")).isFalse();
        assertThat(categoryRepository.existsByMajorAndName(QuestionMajor.CS, "없음")).isFalse();
    }

    private Category category(QuestionMajor major, String name, int sortOrder) {
        return entityManager.persist(Category.builder().major(major).name(name).sortOrder(sortOrder).build());
    }

    private Question adminQuestion(QuestionMajor major, Category category) {
        return entityManager.persist(Question.createByAdmin(major, category, "면접 질문입니다.", null, null, 99L));
    }

    private Question userQuestion(Category category) {
        return entityManager.persist(Question.createByUser(QuestionMajor.CS, category, "프로세스와 스레드의 차이는?", 1L));
    }

    private void flushAndClear() {
        entityManager.flush();
        entityManager.clear();
    }
}
