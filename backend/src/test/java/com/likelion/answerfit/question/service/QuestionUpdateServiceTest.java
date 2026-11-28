package com.likelion.answerfit.question.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import com.likelion.answerfit.question.auth.QuestionMember;
import com.likelion.answerfit.question.dto.request.UpdateQuestionRequest;
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

class QuestionUpdateServiceTest {

    private static final Long QUESTION_ID = 42L;
    private static final Long NEW_CATEGORY_ID = 44L;
    private static final long OWNER_ID = 7L;
    private static final String ORIGINAL_CONTENT = "프로세스와 스레드의 차이를 설명해 주세요.";
    private static final String NEW_CONTENT = "트랜잭션 격리 수준의 차이를 설명해 주세요.";
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
    @MethodSource("editableRequests")
    void 본인_미승인_질문의_제공한_필드만_변경하고_반려는_재제출한다(
            String scenario, QuestionStatus originalStatus, UpdateQuestionRequest request) {
        Question question = spy(userQuestion(OWNER_ID));
        doReturn(QUESTION_ID).when(question).getId();
        if (originalStatus == QuestionStatus.REJECTED) {
            question.reject(99L);
            assertThat(question.getReviewedBy()).isEqualTo(99L);
            assertThat(question.getReviewedAt()).isNotNull();
        }
        Category originalCategory = question.getCategory();
        Category newCategory = Category.builder().major(QuestionMajor.CS).name("데이터베이스").build();
        when(questionRepository.findForUpdateById(QUESTION_ID)).thenReturn(Optional.of(question));
        if (request.categoryId() != null) {
            when(categoryRepository.findById(NEW_CATEGORY_ID)).thenReturn(Optional.of(newCategory));
        }

        var response = service.updateQuestion(QUESTION_ID, request, OWNER);

        assertThat(question.getCategory()).isSameAs(request.categoryId() == null ? originalCategory : newCategory);
        assertThat(question.getContent()).isEqualTo(request.content() == null ? ORIGINAL_CONTENT : NEW_CONTENT);
        assertThat(question.getStatus()).isEqualTo(QuestionStatus.PENDING);
        assertThat(question.getMajor()).isEqualTo(QuestionMajor.CS);
        assertThat(question.getSource()).isEqualTo(QuestionSource.USER);
        assertThat(question.getAuthorId()).isEqualTo(OWNER_ID);
        assertThat(question.getReviewedBy()).isNull();
        assertThat(question.getReviewedAt()).isNull();
        assertThat(question.getDeletedAt()).isNull();
        assertThat(question.getModelAnswer()).isNull();
        assertThat(question.getModelAnswerStatus()).isNull();
        assertThat(question.getKeywords()).isEmpty();
        assertThat(response.id()).isEqualTo(QUESTION_ID.toString());
        assertThat(response.status()).isEqualTo(QuestionStatus.PENDING);
        assertThat(response.canEdit()).isTrue();
        assertThat(response.canDelete()).isTrue();

        verify(questionRepository).findForUpdateById(QUESTION_ID);
        verifyNoMoreInteractions(questionRepository);
        if (request.categoryId() == null) {
            verifyNoInteractions(categoryRepository);
        } else {
            verify(categoryRepository).findById(NEW_CATEGORY_ID);
            verifyNoMoreInteractions(categoryRepository);
        }
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidCategories")
    void 잘못된_카테고리로_수정하면_질문과_검토_상태를_바꾸지_않는다(
            String scenario, QuestionStatus originalStatus, Optional<Category> category) {
        Question question = userQuestion(OWNER_ID);
        if (originalStatus == QuestionStatus.REJECTED) {
            question.reject(99L);
        }
        QuestionSnapshot before = QuestionSnapshot.from(question);
        when(questionRepository.findForUpdateById(QUESTION_ID)).thenReturn(Optional.of(question));
        when(categoryRepository.findById(NEW_CATEGORY_ID)).thenReturn(category);

        assertThatThrownBy(() -> service.updateQuestion(
                QUESTION_ID, new UpdateQuestionRequest(NEW_CATEGORY_ID, NEW_CONTENT), OWNER))
                .isInstanceOfSatisfying(QuestionException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(QuestionErrorCode.INVALID_CATEGORY));

        assertThat(QuestionSnapshot.from(question)).isEqualTo(before);
        verify(questionRepository).findForUpdateById(QUESTION_ID);
        verifyNoMoreInteractions(questionRepository);
        verify(categoryRepository).findById(NEW_CATEGORY_ID);
        verifyNoMoreInteractions(categoryRepository);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("inaccessibleQuestions")
    void 접근_권한과_상태를_먼저_거절하고_분류나_상세_정보를_추가로_읽지_않는다(
            String scenario, Optional<Question> question, QuestionMember member, QuestionErrorCode expected) {
        Optional<QuestionSnapshot> before = question.map(QuestionSnapshot::from);
        when(questionRepository.findForUpdateById(QUESTION_ID)).thenReturn(question);

        assertThatThrownBy(() -> service.updateQuestion(
                QUESTION_ID, new UpdateQuestionRequest(NEW_CATEGORY_ID, NEW_CONTENT), member))
                .isInstanceOfSatisfying(QuestionException.class, exception -> {
                    assertThat(exception.getErrorCode()).isEqualTo(expected);
                    assertThat(exception.getMessage()).isEqualTo(expected.getMessage())
                            .doesNotContain(ORIGINAL_CONTENT, NEW_CONTENT);
                });

        assertThat(question.map(QuestionSnapshot::from)).isEqualTo(before);
        verify(questionRepository).findForUpdateById(QUESTION_ID);
        verifyNoMoreInteractions(questionRepository);
        verifyNoInteractions(categoryRepository);
    }

    private static Stream<Arguments> editableRequests() {
        String paddedContent = "\uFEFF \u00A0" + NEW_CONTENT + " \n";
        return Stream.of(QuestionStatus.PENDING, QuestionStatus.REJECTED).flatMap(status -> Stream.of(
                Arguments.of(status + " 본문만 수정", status, new UpdateQuestionRequest(null, paddedContent)),
                Arguments.of(status + " 카테고리만 수정", status, new UpdateQuestionRequest(NEW_CATEGORY_ID, null)),
                Arguments.of(status + " 본문과 카테고리 수정", status, new UpdateQuestionRequest(NEW_CATEGORY_ID, paddedContent))));
    }

    private static Stream<Arguments> invalidCategories() {
        return Stream.of(QuestionStatus.PENDING, QuestionStatus.REJECTED).flatMap(status -> Stream.of(
                Arguments.of(status + " 존재하지 않는 분류", status, Optional.empty()),
                Arguments.of(status + " 인성 분류", status,
                        Optional.of(Category.builder().major(QuestionMajor.PERSONALITY).name("협업").build()))));
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
        Question adminSource = Question.createByAdmin(QuestionMajor.CS, category(), ORIGINAL_CONTENT, "답안", null, OWNER_ID);

        return Stream.concat(otherMembers, Stream.of(
                Arguments.of("본인 HIDDEN", Optional.of(hidden), OWNER, QuestionErrorCode.QUESTION_NOT_FOUND),
                Arguments.of("본인 삭제 PENDING", Optional.of(deletedPending), OWNER, QuestionErrorCode.QUESTION_NOT_FOUND),
                Arguments.of("본인 삭제 APPROVED", Optional.of(deletedApproved), OWNER, QuestionErrorCode.QUESTION_NOT_FOUND),
                Arguments.of("본인 APPROVED", Optional.of(approved), OWNER, QuestionErrorCode.QUESTION_NOT_EDITABLE),
                Arguments.of("관리자도 본인 USER 승인 질문 수정 불가", Optional.of(approved),
                        new QuestionMember(OWNER_ID, Role.ADMIN), QuestionErrorCode.QUESTION_NOT_EDITABLE),
                Arguments.of("ADMIN 출처는 검토자 본인도 USER 질문처럼 수정 불가", Optional.of(adminSource),
                        new QuestionMember(OWNER_ID, Role.ADMIN), QuestionErrorCode.ACCESS_DENIED),
                Arguments.of("존재하지 않는 질문", Optional.empty(), OWNER, QuestionErrorCode.QUESTION_NOT_FOUND)));
    }

    private static Question userQuestion(Long authorId) {
        return Question.createByUser(QuestionMajor.CS, category(), ORIGINAL_CONTENT, authorId);
    }

    private static Category category() {
        return Category.builder().major(QuestionMajor.CS).name("운영체제").build();
    }

    private record QuestionSnapshot(Category category, String content, QuestionStatus status, QuestionSource source,
                                    Long authorId, Long reviewedBy, Instant reviewedAt, Instant deletedAt) {

        static QuestionSnapshot from(Question question) {
            return new QuestionSnapshot(question.getCategory(), question.getContent(), question.getStatus(),
                    question.getSource(), question.getAuthorId(), question.getReviewedBy(), question.getReviewedAt(),
                    question.getDeletedAt());
        }
    }
}
