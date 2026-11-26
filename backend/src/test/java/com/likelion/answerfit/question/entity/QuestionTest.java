package com.likelion.answerfit.question.entity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class QuestionTest {

    private final Category os = Category.builder().major(QuestionMajor.CS).name("운영체제").build();

    @Test
    void CS_질문은_카테고리가_필수다() {
        assertThatThrownBy(() -> Question.createByUser(QuestionMajor.CS, null, "프로세스란?", 1L))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void 인성_질문은_사용자가_등록할_수_없다() {
        assertThatThrownBy(() -> Question.createByUser(QuestionMajor.PERSONALITY, null, "장점은?", 1L))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void 대분류가_다른_카테고리는_쓸_수_없다() {
        Category personality = Category.builder().major(QuestionMajor.PERSONALITY).name("가치관").build();
        assertThatThrownBy(() -> Question.createByUser(QuestionMajor.CS, personality, "프로세스란?", 1L))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void 승인된_질문은_수정_삭제할_수_없다() {
        Question question = Question.createByUser(QuestionMajor.CS, os, "프로세스란?", 1L);
        question.approve(99L);

        assertThat(question.getModelAnswerStatus()).isEqualTo(ModelAnswerStatus.PENDING);
        assertThatThrownBy(() -> question.update(os, "수정")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(question::delete).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 반려된_질문을_고치면_재제출되어_검토_기록이_초기화된다() {
        Question question = Question.createByUser(QuestionMajor.CS, os, "프로세스란?", 1L);
        question.reject(99L);

        question.update(os, "프로세스와 스레드의 차이는?");

        assertThat(question.getStatus()).isEqualTo(QuestionStatus.PENDING);
        assertThat(question.getReviewedAt()).isNull();
        assertThat(question.getReviewedBy()).isNull();
    }

    @Test
    void 같은_키워드는_두_번_넣을_수_없다() {
        Question question = Question.createByAdmin(QuestionMajor.CS, os, "프로세스란?", "답", null, 99L);
        question.addKeyword("PCB");

        assertThatThrownBy(() -> question.addKeyword("PCB")).isInstanceOf(IllegalArgumentException.class);
        assertThat(question.getKeywords()).hasSize(1);
    }
}
