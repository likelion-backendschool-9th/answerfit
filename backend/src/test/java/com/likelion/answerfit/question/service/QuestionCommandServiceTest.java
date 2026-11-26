package com.likelion.answerfit.question.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;

import com.likelion.answerfit.question.auth.QuestionMember;
import com.likelion.answerfit.question.dto.request.CreateQuestionRequest;
import com.likelion.answerfit.question.dto.response.QuestionCreateResponse;
import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.Question;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.entity.QuestionSource;
import com.likelion.answerfit.question.entity.QuestionStatus;
import com.likelion.answerfit.question.exception.QuestionErrorCode;
import com.likelion.answerfit.question.exception.QuestionException;
import com.likelion.answerfit.question.repository.CategoryRepository;
import com.likelion.answerfit.question.repository.QuestionRepository;
import com.likelion.answerfit.user.entity.Role;

class QuestionCommandServiceTest {

    private QuestionRepository questionRepository;
    private CategoryRepository categoryRepository;
    private QuestionCommandService service;

    @BeforeEach
    void setUp() {
        questionRepository = mock(QuestionRepository.class);
        categoryRepository = mock(CategoryRepository.class);
        service = new QuestionCommandService(questionRepository, categoryRepository);
    }

    @ParameterizedTest
    @EnumSource(Role.class)
    void 회원과_관리자_모두_본인_USER_승인대기_질문으로_등록한다(Role role) {
        Category category = Category.builder().major(QuestionMajor.CS).name("운영체제").sortOrder(10).build();
        CreateQuestionRequest request = new CreateQuestionRequest(3L, "  프로세스와 스레드의 차이를 설명해주세요.  ");
        QuestionMember member = new QuestionMember(7L, role);
        Question saved = mock(Question.class);
        when(categoryRepository.findById(3L)).thenReturn(Optional.of(category));
        when(saved.getId()).thenReturn(42L);
        when(saved.getStatus()).thenReturn(QuestionStatus.PENDING);
        when(questionRepository.save(any(Question.class))).thenReturn(saved);

        QuestionCreateResponse response = service.createQuestion(request, member);

        ArgumentCaptor<Question> captor = ArgumentCaptor.forClass(Question.class);
        verify(categoryRepository).findById(3L);
        verify(questionRepository).save(captor.capture());
        Question submitted = captor.getValue();
        assertThat(submitted.getMajor()).isEqualTo(QuestionMajor.CS);
        assertThat(submitted.getSource()).isEqualTo(QuestionSource.USER);
        assertThat(submitted.getAuthorId()).isEqualTo(member.userId());
        assertThat(submitted.getStatus()).isEqualTo(QuestionStatus.PENDING);
        assertThat(submitted.getContent()).isEqualTo("프로세스와 스레드의 차이를 설명해주세요.");
        assertThat(submitted.getCategory()).isSameAs(category);
        assertThat(submitted.getReviewedBy()).isNull();
        assertThat(submitted.getReviewedAt()).isNull();
        assertThat(submitted.getModelAnswer()).isNull();
        assertThat(submitted.getModelAnswerStatus()).isNull();
        assertThat(submitted.getKeywords()).isEmpty();
        assertThat(response.id()).isEqualTo("42");
        assertThat(response.status()).isEqualTo(QuestionStatus.PENDING);
        verifyNoMoreInteractions(categoryRepository, questionRepository);
    }

    @Test
    void 없는_카테고리는_질문을_저장하지_않고_거절한다() {
        when(categoryRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createQuestion(
                new CreateQuestionRequest(404L, "프로세스와 스레드의 차이는?"), new QuestionMember(7L, Role.USER)))
                .isInstanceOfSatisfying(QuestionException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(QuestionErrorCode.INVALID_CATEGORY));

        verify(categoryRepository).findById(404L);
        verifyNoMoreInteractions(categoryRepository);
        verifyNoInteractions(questionRepository);
    }

    @Test
    void 인성_카테고리는_질문을_저장하지_않고_거절한다() {
        Category personality = Category.builder().major(QuestionMajor.PERSONALITY).name("협업").build();
        when(categoryRepository.findById(6L)).thenReturn(Optional.of(personality));

        assertThatThrownBy(() -> service.createQuestion(
                new CreateQuestionRequest(6L, "협업 과정에서 겪은 갈등을 설명해주세요."), new QuestionMember(7L, Role.ADMIN)))
                .isInstanceOfSatisfying(QuestionException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(QuestionErrorCode.INVALID_CATEGORY));

        verify(categoryRepository).findById(6L);
        verifyNoMoreInteractions(categoryRepository);
        verifyNoInteractions(questionRepository);
    }
}
