package com.likelion.answerfit.question.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;

import com.likelion.answerfit.question.auth.QuestionMember;
import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.Question;
import com.likelion.answerfit.question.entity.QuestionLike;
import com.likelion.answerfit.question.entity.QuestionLikeId;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.entity.QuestionStatus;
import com.likelion.answerfit.question.exception.QuestionErrorCode;
import com.likelion.answerfit.question.exception.QuestionException;
import com.likelion.answerfit.question.repository.QuestionLikeRepository;
import com.likelion.answerfit.question.repository.QuestionRepository;
import com.likelion.answerfit.user.entity.Role;

class QuestionLikeServiceTest {

    private static final Long QUESTION_ID = 42L;
    private static final long MEMBER_ID = 7L;
    private static final String CONTENT = "프로세스와 스레드의 차이를 설명해 주세요.";
    private static final QuestionMember MEMBER = new QuestionMember(MEMBER_ID, Role.USER);
    private static final QuestionLikeId LIKE_ID = new QuestionLikeId(MEMBER_ID, QUESTION_ID);

    private QuestionRepository questionRepository;
    private QuestionLikeRepository likeRepository;
    private QuestionLikeService service;

    @BeforeEach
    void setUp() {
        questionRepository = mock(QuestionRepository.class);
        likeRepository = mock(QuestionLikeRepository.class);
        service = new QuestionLikeService(questionRepository, likeRepository);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("publicQuestions")
    void 공개_질문은_본인_작성_여부나_역할과_관계없이_본인_좋아요를_등록한다(
            String scenario, Question question, QuestionMember member) {
        when(questionRepository.findForUpdateById(QUESTION_ID)).thenReturn(Optional.of(question));
        QuestionLikeId id = new QuestionLikeId(member.userId(), QUESTION_ID);
        when(likeRepository.existsById(id)).thenReturn(false);
        when(likeRepository.countByIdQuestionId(QUESTION_ID)).thenReturn(5L);

        var response = service.likeQuestion(QUESTION_ID, member);

        assertThat(response.likeCount()).isEqualTo(5);
        assertThat(response.isLiked()).isTrue();
        ArgumentCaptor<QuestionLike> captured = ArgumentCaptor.forClass(QuestionLike.class);
        InOrder order = inOrder(questionRepository, likeRepository);
        order.verify(questionRepository).findForUpdateById(QUESTION_ID);
        order.verify(likeRepository).existsById(id);
        order.verify(likeRepository).saveAndFlush(captured.capture());
        order.verify(likeRepository).countByIdQuestionId(QUESTION_ID);
        QuestionLike saved = captured.getValue();
        assertThat(saved.getId()).isEqualTo(id);
        assertThat(saved.getId().getUserId()).isEqualTo(member.userId());
        assertThat(saved.getId().getQuestionId()).isEqualTo(QUESTION_ID);
        assertThat(saved.getQuestion()).isSameAs(question);
        verifyNoMoreInteractions(questionRepository, likeRepository);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("publicQuestions")
    void 공개_질문의_본인_키만_해제하고_flush_후_전체_건수를_반환한다(
            String scenario, Question question, QuestionMember member) {
        when(questionRepository.findForUpdateById(QUESTION_ID)).thenReturn(Optional.of(question));
        when(likeRepository.countByIdQuestionId(QUESTION_ID)).thenReturn(3L);
        QuestionLikeId id = new QuestionLikeId(member.userId(), QUESTION_ID);

        var response = service.unlikeQuestion(QUESTION_ID, member);

        assertThat(response.likeCount()).isEqualTo(3);
        assertThat(response.isLiked()).isFalse();
        InOrder order = inOrder(questionRepository, likeRepository);
        order.verify(questionRepository).findForUpdateById(QUESTION_ID);
        order.verify(likeRepository).deleteById(id);
        order.verify(likeRepository).flush();
        order.verify(likeRepository).countByIdQuestionId(QUESTION_ID);
        verifyNoMoreInteractions(questionRepository, likeRepository);
    }

    @Test
    void 이미_좋아요했으면_기존_행을_다시_저장하거나_지우지_않는다() {
        Question question = approvedUserQuestion(MEMBER_ID);
        when(questionRepository.findForUpdateById(QUESTION_ID)).thenReturn(Optional.of(question));
        when(likeRepository.existsById(LIKE_ID)).thenReturn(true);
        when(likeRepository.countByIdQuestionId(QUESTION_ID)).thenReturn(6L);

        var response = service.likeQuestion(QUESTION_ID, MEMBER);

        assertThat(response.likeCount()).isEqualTo(6);
        assertThat(response.isLiked()).isTrue();
        verify(questionRepository).findForUpdateById(QUESTION_ID);
        verify(likeRepository).existsById(LIKE_ID);
        verify(likeRepository).countByIdQuestionId(QUESTION_ID);
        verifyNoMoreInteractions(questionRepository, likeRepository);
    }

    @Test
    void 반복_등록은_첫_좋아요_하나만_만들고_매번_최종_집계를_반환한다() {
        Question question = approvedUserQuestion(2L);
        when(questionRepository.findForUpdateById(QUESTION_ID)).thenReturn(Optional.of(question));
        when(likeRepository.existsById(LIKE_ID)).thenReturn(false, true);
        when(likeRepository.countByIdQuestionId(QUESTION_ID)).thenReturn(1L, 2L);

        var first = service.likeQuestion(QUESTION_ID, MEMBER);
        var repeated = service.likeQuestion(QUESTION_ID, MEMBER);

        assertThat(first.likeCount()).isEqualTo(1);
        assertThat(first.isLiked()).isTrue();
        assertThat(repeated.likeCount()).isEqualTo(2);
        assertThat(repeated.isLiked()).isTrue();
        ArgumentCaptor<QuestionLike> captured = ArgumentCaptor.forClass(QuestionLike.class);
        verify(questionRepository, times(2)).findForUpdateById(QUESTION_ID);
        verify(likeRepository, times(2)).existsById(LIKE_ID);
        verify(likeRepository).saveAndFlush(captured.capture());
        verify(likeRepository, times(2)).countByIdQuestionId(QUESTION_ID);
        assertThat(captured.getValue().getId()).isEqualTo(LIKE_ID);
        verifyNoMoreInteractions(questionRepository, likeRepository);
    }

    @Test
    void 반복_취소도_본인_키만_해제하며_없는_좋아요를_새로_만들지_않는다() {
        Question question = approvedUserQuestion(2L);
        when(questionRepository.findForUpdateById(QUESTION_ID)).thenReturn(Optional.of(question));
        when(likeRepository.countByIdQuestionId(QUESTION_ID)).thenReturn(2L);

        var first = service.unlikeQuestion(QUESTION_ID, MEMBER);
        var repeated = service.unlikeQuestion(QUESTION_ID, MEMBER);

        assertThat(first.likeCount()).isEqualTo(2);
        assertThat(repeated.likeCount()).isEqualTo(2);
        assertThat(first.isLiked()).isFalse();
        assertThat(repeated.isLiked()).isFalse();
        verify(questionRepository, times(2)).findForUpdateById(QUESTION_ID);
        verify(likeRepository, times(2)).deleteById(LIKE_ID);
        verify(likeRepository, times(2)).flush();
        verify(likeRepository, times(2)).countByIdQuestionId(QUESTION_ID);
        verifyNoMoreInteractions(questionRepository, likeRepository);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("inaccessibleQuestions")
    void 비공개이거나_없는_질문은_본인이나_관리자라도_좋아요_관계를_읽거나_바꾸지_않는다(
            String scenario, Operation operation, Optional<Question> question, QuestionMember member) {
        Optional<QuestionStatus> previousStatus = question.map(Question::getStatus);
        Optional<Instant> previousDeletedAt = question.map(Question::getDeletedAt);
        when(questionRepository.findForUpdateById(QUESTION_ID)).thenReturn(question);

        assertThatThrownBy(() -> operation.perform(service, member))
                .isInstanceOfSatisfying(QuestionException.class, exception -> {
                    assertThat(exception.getErrorCode()).isEqualTo(QuestionErrorCode.QUESTION_NOT_FOUND);
                    assertThat(exception.getMessage()).isEqualTo(QuestionErrorCode.QUESTION_NOT_FOUND.getMessage())
                            .doesNotContain(CONTENT);
                });

        assertThat(question.map(Question::getStatus)).isEqualTo(previousStatus);
        assertThat(question.map(Question::getDeletedAt)).isEqualTo(previousDeletedAt);
        verify(questionRepository).findForUpdateById(QUESTION_ID);
        verifyNoMoreInteractions(questionRepository);
        verifyNoInteractions(likeRepository);
    }

    private static Stream<Arguments> publicQuestions() {
        return Stream.of(Role.values()).flatMap(role -> {
            Question other = approvedUserQuestion(2L);
            other.failModelAnswer();
            Question admin = persisted(Question.createByAdmin(QuestionMajor.CS, category(), CONTENT, null, null, 99L));
            QuestionMember member = new QuestionMember(MEMBER_ID, role);
            return Stream.of(
                    Arguments.of("본인 USER 답안 생성 중: " + role, approvedUserQuestion(MEMBER_ID), member),
                    Arguments.of("타인 USER 답안 생성 실패: " + role, other, member),
                    Arguments.of("ADMIN 출처 답안 없음: " + role, admin, member));
        });
    }

    private static Stream<Arguments> inaccessibleQuestions() {
        return Stream.of(Operation.values()).flatMap(operation -> {
            Question ownPending = userQuestion(MEMBER_ID);
            Question ownRejected = userQuestion(MEMBER_ID);
            ownRejected.reject(99L);
            Question otherPending = userQuestion(2L);
            Question otherRejected = userQuestion(2L);
            otherRejected.reject(99L);
            Question ownHidden = approvedUserQuestion(MEMBER_ID);
            ownHidden.hide();
            Question otherHidden = approvedUserQuestion(2L);
            otherHidden.hide();
            Question deletedPending = userQuestion(MEMBER_ID);
            deletedPending.delete();
            Question deletedApproved = approvedUserQuestion(MEMBER_ID);
            deletedApproved.deleteByAdmin();
            QuestionMember admin = new QuestionMember(MEMBER_ID, Role.ADMIN);
            return Stream.of(
                    Arguments.of(operation + " 본인 PENDING", operation, Optional.of(ownPending), MEMBER),
                    Arguments.of(operation + " 본인 REJECTED", operation, Optional.of(ownRejected), MEMBER),
                    Arguments.of(operation + " 관리자도 타인 PENDING 불가", operation, Optional.of(otherPending), admin),
                    Arguments.of(operation + " 관리자도 타인 REJECTED 불가", operation, Optional.of(otherRejected), admin),
                    Arguments.of(operation + " 본인 HIDDEN", operation, Optional.of(ownHidden), MEMBER),
                    Arguments.of(operation + " 관리자도 타인 HIDDEN 불가", operation, Optional.of(otherHidden), admin),
                    Arguments.of(operation + " 삭제된 PENDING", operation, Optional.of(deletedPending), MEMBER),
                    Arguments.of(operation + " 삭제된 APPROVED", operation, Optional.of(deletedApproved), MEMBER),
                    Arguments.of(operation + " 없는 질문", operation, Optional.empty(), MEMBER));
        });
    }

    private static Question approvedUserQuestion(Long authorId) {
        Question question = userQuestion(authorId);
        question.approve(99L);
        return persisted(question);
    }

    private static Question userQuestion(Long authorId) {
        return Question.createByUser(QuestionMajor.CS, category(), CONTENT, authorId);
    }

    private static Question persisted(Question question) {
        Question persisted = spy(question);
        doReturn(QUESTION_ID).when(persisted).getId();
        return persisted;
    }

    private static Category category() {
        return Category.builder().major(QuestionMajor.CS).name("운영체제").build();
    }

    private enum Operation {
        LIKE,
        UNLIKE;

        void perform(QuestionLikeService service, QuestionMember member) {
            if (this == LIKE) {
                service.likeQuestion(QUESTION_ID, member);
            } else {
                service.unlikeQuestion(QUESTION_ID, member);
            }
        }
    }
}
