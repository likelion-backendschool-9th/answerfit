package com.likelion.answerfit.question.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import com.likelion.answerfit.question.auth.QuestionMember;
import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.Question;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.exception.QuestionErrorCode;
import com.likelion.answerfit.question.exception.QuestionException;
import com.likelion.answerfit.question.repository.CategoryRepository;
import com.likelion.answerfit.question.repository.QuestionRepository;
import com.likelion.answerfit.user.entity.Role;

class QuestionDetailServiceTest {

    private static final Long QUESTION_ID = 42L;
    private static final String PRIVATE_CONTENT = "외부에 공개하면 안 되는 질문 본문입니다.";
    private static final String PRIVATE_ANSWER = "외부에 공개하면 안 되는 모범답안입니다.";
    private static final String PRIVATE_HINT = "외부에 공개하면 안 되는 힌트입니다.";
    private static final String PRIVATE_KEYWORD = "비공개 키워드";

    private QuestionRepository questionRepository;
    private CategoryRepository categoryRepository;
    private QuestionQueryService service;

    @BeforeEach
    void setUp() {
        questionRepository = mock(QuestionRepository.class);
        categoryRepository = mock(CategoryRepository.class);
        service = new QuestionQueryService(questionRepository, categoryRepository);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("inaccessibleQuestions")
    void 접근할_수_없으면_내용을_노출하거나_추가_상세를_조회하지_않는다(
            String scenario, Optional<Question> question, QuestionMember member) {
        when(questionRepository.findDetailById(QUESTION_ID)).thenReturn(question);

        assertThatThrownBy(() -> service.getQuestion(QUESTION_ID, member))
                .isInstanceOfSatisfying(QuestionException.class, exception -> {
                    assertThat(exception.getErrorCode()).isEqualTo(QuestionErrorCode.QUESTION_NOT_FOUND);
                    assertThat(exception.getMessage())
                            .isEqualTo(QuestionErrorCode.QUESTION_NOT_FOUND.getMessage())
                            .doesNotContain(PRIVATE_CONTENT, PRIVATE_ANSWER, PRIVATE_HINT, PRIVATE_KEYWORD);
                });

        verify(questionRepository).findDetailById(QUESTION_ID);
        verifyNoMoreInteractions(questionRepository);
        verifyNoInteractions(categoryRepository);
    }

    private static Stream<Arguments> inaccessibleQuestions() {
        Stream<Arguments> otherMembers = Stream.of(Role.USER, Role.ADMIN).flatMap(role -> {
            Question pending = privateUserQuestion(2L);
            Question rejected = privateUserQuestion(2L);
            rejected.reject(99L);
            QuestionMember viewer = new QuestionMember(1L, role);
            return Stream.of(
                    Arguments.of("다른 회원의 PENDING 질문: " + role, Optional.of(pending), viewer),
                    Arguments.of("다른 회원의 REJECTED 질문: " + role, Optional.of(rejected), viewer));
        });

        QuestionMember owner = new QuestionMember(1L, Role.USER);
        Question hidden = privateUserQuestion(1L);
        hidden.approve(99L);
        hidden.completeModelAnswer(PRIVATE_ANSWER);
        hidden.hide();

        Question deletedPending = privateUserQuestion(1L);
        deletedPending.delete();

        Question deletedApproved = privateUserQuestion(1L);
        deletedApproved.approve(99L);
        deletedApproved.completeModelAnswer(PRIVATE_ANSWER);
        deletedApproved.deleteByAdmin();

        return Stream.concat(otherMembers, Stream.of(
                Arguments.of("본인의 HIDDEN 질문", Optional.of(hidden), owner),
                Arguments.of("본인의 삭제된 PENDING 질문", Optional.of(deletedPending), owner),
                Arguments.of("본인의 삭제된 APPROVED 질문", Optional.of(deletedApproved), owner),
                Arguments.of("존재하지 않는 질문", Optional.empty(), owner)));
    }

    private static Question privateUserQuestion(Long authorId) {
        Category category = Category.builder().major(QuestionMajor.CS).name("운영체제").build();
        Question question = Question.createByUser(QuestionMajor.CS, category, PRIVATE_CONTENT, authorId);
        question.updateByAdmin(category, PRIVATE_CONTENT, PRIVATE_ANSWER, PRIVATE_HINT);
        question.addKeyword(PRIVATE_KEYWORD);
        return question;
    }
}
