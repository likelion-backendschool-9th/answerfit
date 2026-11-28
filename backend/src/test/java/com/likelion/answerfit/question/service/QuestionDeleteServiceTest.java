package com.likelion.answerfit.question.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import com.likelion.answerfit.question.auth.QuestionMember;
import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.ModelAnswerStatus;
import com.likelion.answerfit.question.entity.Question;
import com.likelion.answerfit.question.entity.QuestionKeyword;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.entity.QuestionSource;
import com.likelion.answerfit.question.entity.QuestionStatus;
import com.likelion.answerfit.question.exception.QuestionErrorCode;
import com.likelion.answerfit.question.exception.QuestionException;
import com.likelion.answerfit.question.repository.CategoryRepository;
import com.likelion.answerfit.question.repository.QuestionRepository;
import com.likelion.answerfit.user.entity.Role;

class QuestionDeleteServiceTest {

    private static final Long QUESTION_ID = 42L;
    private static final long OWNER_ID = 7L;
    private static final String CONTENT = "공개하지 않은 프로세스 질문의 원문입니다.";
    private static final String ANSWER = "삭제할 때도 보존할 기존 모범답안입니다.";
    private static final String HINT = "삭제할 때도 보존할 기존 힌트입니다.";
    private static final QuestionMember OWNER = new QuestionMember(OWNER_ID, Role.USER);

    private QuestionRepository questionRepository;
    private CategoryRepository categoryRepository;
    private QuestionCommandService service;

    @BeforeEach
    void setUp() {
        questionRepository = mock(QuestionRepository.class);
        categoryRepository = mock(CategoryRepository.class);
        service = new QuestionCommandService(questionRepository, categoryRepository);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("deletableQuestions")
    void 본인_USER_미승인_질문은_삭제_표시만_남기고_내용과_검토_정보를_보존한다(
            String scenario, QuestionStatus originalStatus, Role role) {
        Question question = userQuestion(OWNER_ID);
        if (originalStatus == QuestionStatus.REJECTED) {
            question.reject(99L);
            assertThat(question.getReviewedBy()).isEqualTo(99L);
            assertThat(question.getReviewedAt()).isNotNull();
        }
        QuestionSnapshot before = QuestionSnapshot.from(question);
        assertThat(question.getDeletedAt()).isNull();
        when(questionRepository.findForUpdateById(QUESTION_ID)).thenReturn(Optional.of(question));

        service.deleteQuestion(QUESTION_ID, new QuestionMember(OWNER_ID, role));

        assertThat(question.getDeletedAt()).isNotNull();
        assertThat(QuestionSnapshot.from(question)).isEqualTo(before);
        verifyOnlyLockedLookup();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("inaccessibleQuestions")
    void 권한이나_상태가_맞지_않으면_삭제_표시와_기존_데이터를_바꾸지_않는다(
            String scenario, Optional<Question> question, QuestionMember member, QuestionErrorCode expected) {
        Optional<QuestionSnapshot> before = question.map(QuestionSnapshot::from);
        Optional<Instant> previousDeletedAt = question.map(Question::getDeletedAt);
        when(questionRepository.findForUpdateById(QUESTION_ID)).thenReturn(question);

        assertThatThrownBy(() -> service.deleteQuestion(QUESTION_ID, member))
                .isInstanceOfSatisfying(QuestionException.class, exception -> {
                    assertThat(exception.getErrorCode()).isEqualTo(expected);
                    assertThat(exception.getMessage()).isEqualTo(expected.getMessage())
                            .doesNotContain(CONTENT, ANSWER, HINT);
                });

        assertThat(question.map(QuestionSnapshot::from)).isEqualTo(before);
        assertThat(question.map(Question::getDeletedAt)).isEqualTo(previousDeletedAt);
        verifyOnlyLockedLookup();
    }

    private void verifyOnlyLockedLookup() {
        verify(questionRepository).findForUpdateById(QUESTION_ID);
        verifyNoMoreInteractions(questionRepository);
        verifyNoInteractions(categoryRepository);
    }

    private static Stream<Arguments> deletableQuestions() {
        return Stream.of(Role.USER, Role.ADMIN).flatMap(role ->
                Stream.of(QuestionStatus.PENDING, QuestionStatus.REJECTED)
                        .map(status -> Arguments.of("본인 " + status + ": " + role, status, role)));
    }

    private static Stream<Arguments> inaccessibleQuestions() {
        Stream<Arguments> otherMembers = Stream.of(Role.USER, Role.ADMIN).flatMap(role -> {
            Question pending = userQuestion(2L);
            Question rejected = userQuestion(2L);
            rejected.reject(99L);
            Question approved = userQuestion(2L);
            approved.approve(99L);
            QuestionMember viewer = new QuestionMember(OWNER_ID, role);
            return Stream.of(
                    Arguments.of("타인 PENDING: " + role, Optional.of(pending), viewer, QuestionErrorCode.QUESTION_NOT_FOUND),
                    Arguments.of("타인 REJECTED: " + role, Optional.of(rejected), viewer, QuestionErrorCode.QUESTION_NOT_FOUND),
                    Arguments.of("타인 APPROVED: " + role, Optional.of(approved), viewer, QuestionErrorCode.ACCESS_DENIED));
        });

        Question hidden = userQuestion(OWNER_ID);
        hidden.approve(99L);
        hidden.hide();
        Question deletedPending = userQuestion(OWNER_ID);
        deletedPending.delete();
        Question deletedApproved = userQuestion(OWNER_ID);
        deletedApproved.approve(99L);
        deletedApproved.deleteByAdmin();
        Question approved = userQuestion(OWNER_ID);
        approved.approve(99L);
        Question adminSource = Question.createByAdmin(QuestionMajor.CS, category(), CONTENT, ANSWER, HINT, OWNER_ID);

        return Stream.concat(otherMembers, Stream.of(
                Arguments.of("본인 HIDDEN", Optional.of(hidden), OWNER, QuestionErrorCode.QUESTION_NOT_FOUND),
                Arguments.of("본인 삭제 PENDING", Optional.of(deletedPending), OWNER, QuestionErrorCode.QUESTION_NOT_FOUND),
                Arguments.of("본인 삭제 APPROVED", Optional.of(deletedApproved), OWNER, QuestionErrorCode.QUESTION_NOT_FOUND),
                Arguments.of("본인 APPROVED", Optional.of(approved), OWNER, QuestionErrorCode.QUESTION_NOT_EDITABLE),
                Arguments.of("관리자도 본인 USER 승인 질문 삭제 불가", Optional.of(approved),
                        new QuestionMember(OWNER_ID, Role.ADMIN), QuestionErrorCode.QUESTION_NOT_EDITABLE),
                Arguments.of("ADMIN 출처는 검토자 본인도 USER 질문처럼 삭제 불가", Optional.of(adminSource),
                        new QuestionMember(OWNER_ID, Role.ADMIN), QuestionErrorCode.ACCESS_DENIED),
                Arguments.of("존재하지 않는 질문", Optional.empty(), OWNER, QuestionErrorCode.QUESTION_NOT_FOUND)));
    }

    private static Question userQuestion(Long authorId) {
        Category category = category();
        Question question = Question.createByUser(QuestionMajor.CS, category, CONTENT, authorId);
        question.updateByAdmin(category, CONTENT, ANSWER, HINT);
        question.addKeyword("프로세스");
        return question;
    }

    private static Category category() {
        return Category.builder().major(QuestionMajor.CS).name("운영체제").build();
    }

    private record QuestionSnapshot(Category category, QuestionMajor major, String content, QuestionStatus status,
                                    QuestionSource source, Long authorId, Long reviewedBy, Instant reviewedAt,
                                    String modelAnswer, ModelAnswerStatus modelAnswerStatus, String hint,
                                    List<String> keywords) {

        static QuestionSnapshot from(Question question) {
            return new QuestionSnapshot(question.getCategory(), question.getMajor(), question.getContent(),
                    question.getStatus(), question.getSource(), question.getAuthorId(), question.getReviewedBy(),
                    question.getReviewedAt(), question.getModelAnswer(), question.getModelAnswerStatus(),
                    question.getHint(), question.getKeywords().stream().map(QuestionKeyword::getKeyword).toList());
        }
    }
}
