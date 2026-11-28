package com.likelion.answerfit.question.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Supplier;
import java.util.stream.Stream;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.likelion.answerfit.question.auth.QuestionMember;
import com.likelion.answerfit.question.dto.response.QuestionLikeResponse;
import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.Question;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.entity.QuestionStatus;
import com.likelion.answerfit.question.exception.QuestionErrorCode;
import com.likelion.answerfit.question.exception.QuestionException;
import com.likelion.answerfit.question.repository.CategoryRepository;
import com.likelion.answerfit.question.repository.QuestionRepository;
import com.likelion.answerfit.user.entity.Role;

import jakarta.persistence.EntityManager;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE, properties = {
        "answerfit.question.seed-enabled=false",
        "spring.datasource.url=jdbc:h2:mem:question-like-concurrency;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=3000",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class QuestionLikeConcurrencyTest {

    private static final QuestionMember MEMBER = new QuestionMember(1L, Role.USER);

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private QuestionLikeService service;

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private EntityManager entityManager;

    private TransactionTemplate transactions;
    private ExecutorService executor;
    private CountDownLatch allowCommit;
    private Fixture fixture;

    @BeforeEach
    void setUp() {
        transactions = new TransactionTemplate(transactionManager);
        executor = Executors.newFixedThreadPool(3);
        allowCommit = new CountDownLatch(1);
        fixture = transactions.execute(transaction -> {
            Category category = categoryRepository.save(Category.builder().major(QuestionMajor.CS)
                    .name("좋아요경합-" + UUID.randomUUID()).sortOrder(100).build());
            Question question = questionRepository.save(Question.createByAdmin(QuestionMajor.CS, category,
                    "프로세스와 스레드의 차이를 설명해주세요.", null, null, 99L));
            return new Fixture(question.getId(), category.getId());
        });
    }

    @AfterEach
    void cleanUp() throws InterruptedException {
        allowCommit.countDown();
        executor.shutdownNow();
        try {
            assertThat(executor.awaitTermination(5, TimeUnit.SECONDS)).isTrue();
        } finally {
            if (fixture != null) {
                transactions.executeWithoutResult(transaction -> {
                    entityManager.createNativeQuery("delete from question_likes where question_id = :id")
                            .setParameter("id", fixture.questionId()).executeUpdate();
                    entityManager.createNativeQuery("delete from questions where id = :id")
                            .setParameter("id", fixture.questionId()).executeUpdate();
                    entityManager.createNativeQuery("delete from categories where id = :id")
                            .setParameter("id", fixture.categoryId()).executeUpdate();
                });
            }
        }
    }

    @Test
    void 동일_회원의_동시_등록은_대기_후에도_좋아요_한_행만_유지한다() throws Exception {
        OrderedResults<QuestionLikeResponse, QuestionLikeResponse> results = runInOrder(
                () -> service.likeQuestion(fixture.questionId(), MEMBER),
                () -> service.likeQuestion(fixture.questionId(), MEMBER));

        assertThat(results.first()).isEqualTo(new QuestionLikeResponse(1, true));
        assertThat(results.second()).isEqualTo(new QuestionLikeResponse(1, true));
        assertThat(likedMembers()).containsExactly(1L);
        assertThat(snapshot()).isEqualTo(new Snapshot(QuestionStatus.APPROVED, false, 1));
    }

    @Test
    void 서로_다른_회원의_동시_등록도_모든_관계와_정확한_건수를_보존한다() throws Exception {
        CountDownLatch ready = new CountDownLatch(3);
        List<Future<QuestionLikeResponse>> requests = new ArrayList<>();
        for (long userId : new long[] {1, 2, 3}) {
            QuestionMember member = new QuestionMember(userId, Role.USER);
            requests.add(executor.submit(() -> {
                ready.countDown();
                await(allowCommit);
                return service.likeQuestion(fixture.questionId(), member);
            }));
        }
        await(ready);
        allowCommit.countDown();

        List<Long> counts = new ArrayList<>();
        for (Future<QuestionLikeResponse> request : requests) {
            QuestionLikeResponse response = request.get(5, TimeUnit.SECONDS);
            counts.add(response.likeCount());
            assertThat(response.isLiked()).isTrue();
        }
        assertThat(counts).containsExactlyInAnyOrder(1L, 2L, 3L);
        assertThat(likedMembers()).containsExactly(1L, 2L, 3L);
        assertThat(snapshot()).isEqualTo(new Snapshot(QuestionStatus.APPROVED, false, 3));
    }

    @Test
    void 기존_좋아요의_동시_취소는_모두_취소된_최종_상태를_반환한다() throws Exception {
        service.likeQuestion(fixture.questionId(), MEMBER);

        OrderedResults<QuestionLikeResponse, QuestionLikeResponse> results = runInOrder(
                () -> service.unlikeQuestion(fixture.questionId(), MEMBER),
                () -> service.unlikeQuestion(fixture.questionId(), MEMBER));

        assertThat(results.first()).isEqualTo(new QuestionLikeResponse(0, false));
        assertThat(results.second()).isEqualTo(new QuestionLikeResponse(0, false));
        assertThat(likedMembers()).isEmpty();
        assertThat(snapshot()).isEqualTo(new Snapshot(QuestionStatus.APPROVED, false, 0));
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void 등록과_취소가_경합하면_잠금_획득_순서대로_최종_상태가_정해진다(boolean registrationFirst) throws Exception {
        if (!registrationFirst) {
            service.likeQuestion(fixture.questionId(), MEMBER);
        }

        OrderedResults<QuestionLikeResponse, QuestionLikeResponse> results = runInOrder(
                () -> react(registrationFirst), () -> react(!registrationFirst));

        assertThat(results.first()).isEqualTo(new QuestionLikeResponse(registrationFirst ? 1 : 0, registrationFirst));
        assertThat(results.second()).isEqualTo(new QuestionLikeResponse(registrationFirst ? 0 : 1, !registrationFirst));
        assertThat(snapshot()).isEqualTo(new Snapshot(QuestionStatus.APPROVED, false, registrationFirst ? 0 : 1));
        assertThat(likedMembers()).containsExactly(registrationFirst ? new Long[] {} : new Long[] {1L});
    }

    @ParameterizedTest(name = "{0}, like={1}")
    @MethodSource("moderationBeforeReactionCases")
    void 관리자_숨김이나_삭제가_먼저면_대기한_등록과_취소는_거절되고_기존_관계는_남는다(
            ModerationAction action, boolean registration) {
        service.likeQuestion(fixture.questionId(), MEMBER);

        assertThatThrownBy(() -> runInOrder(() -> {
            Question question = questionRepository.findForUpdateById(fixture.questionId()).orElseThrow();
            action.apply(question);
            return true;
        }, () -> react(registration)))
                .isInstanceOfSatisfying(ExecutionException.class, failure ->
                        assertThat(failure.getCause()).isInstanceOfSatisfying(QuestionException.class,
                                exception -> assertThat(exception.getErrorCode())
                                        .isEqualTo(QuestionErrorCode.QUESTION_NOT_FOUND)));

        assertThat(snapshot()).isEqualTo(action.expectedSnapshot(1));
        assertThat(likedMembers()).containsExactly(1L);
    }

    @ParameterizedTest
    @EnumSource(ModerationAction.class)
    void 좋아요가_먼저_커밋되면_관리자는_기다린_후_숨기거나_삭제하며_관계를_보존한다(
            ModerationAction action) throws Exception {
        OrderedResults<QuestionLikeResponse, Boolean> results = runInOrder(
                () -> service.likeQuestion(fixture.questionId(), MEMBER),
                () -> transactions.execute(transaction -> {
                    Question question = questionRepository.findForUpdateById(fixture.questionId()).orElseThrow();
                    boolean wasPublic = question.getStatus() == QuestionStatus.APPROVED && question.getDeletedAt() == null;
                    action.apply(question);
                    return wasPublic;
                }));

        assertThat(results.first()).isEqualTo(new QuestionLikeResponse(1, true));
        assertThat(results.second()).isTrue();
        assertThat(snapshot()).isEqualTo(action.expectedSnapshot(1));
        assertThat(likedMembers()).containsExactly(1L);
    }

    private <T, U> OrderedResults<T, U> runInOrder(Supplier<T> firstAction, Supplier<U> secondAction) throws Exception {
        CountDownLatch firstHoldingLock = new CountDownLatch(1);
        CountDownLatch secondStarted = new CountDownLatch(1);
        Future<T> first = executor.submit(() -> transactions.execute(transaction -> {
            T response = firstAction.get();
            entityManager.flush();
            firstHoldingLock.countDown();
            await(allowCommit);
            return response;
        }));
        await(firstHoldingLock);

        Future<U> second = executor.submit(() -> {
            secondStarted.countDown();
            return secondAction.get();
        });
        await(secondStarted);
        assertThatThrownBy(() -> second.get(200, TimeUnit.MILLISECONDS)).isInstanceOf(TimeoutException.class);
        allowCommit.countDown();
        return new OrderedResults<>(first.get(5, TimeUnit.SECONDS), second.get(5, TimeUnit.SECONDS));
    }

    private QuestionLikeResponse react(boolean registration) {
        return registration ? service.likeQuestion(fixture.questionId(), MEMBER)
                : service.unlikeQuestion(fixture.questionId(), MEMBER);
    }

    private Snapshot snapshot() {
        return transactions.execute(transaction -> {
            Object[] row = (Object[]) entityManager.createNativeQuery("""
                    select question.status, question.deleted_at,
                        (select count(*) from question_likes reaction where reaction.question_id = question.id)
                    from questions question where question.id = :id
                    """).setParameter("id", fixture.questionId()).getSingleResult();
            return new Snapshot(QuestionStatus.valueOf((String) row[0]), row[1] != null, ((Number) row[2]).longValue());
        });
    }

    private List<Long> likedMembers() {
        return transactions.execute(transaction -> {
            List<?> values = entityManager.createNativeQuery("""
                    select user_id from question_likes where question_id = :id order by user_id
                    """).setParameter("id", fixture.questionId()).getResultList();
            return values.stream().map(value -> ((Number) value).longValue()).toList();
        });
    }

    private static Stream<Arguments> moderationBeforeReactionCases() {
        return Stream.of(ModerationAction.values()).flatMap(action -> Stream.of(
                Arguments.of(action, true), Arguments.of(action, false)));
    }

    private static void await(CountDownLatch latch) {
        try {
            assertThat(latch.await(5, TimeUnit.SECONDS)).isTrue();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new AssertionError("좋아요 경합 테스트 스레드가 중단되었습니다.", exception);
        }
    }

    private enum ModerationAction {
        HIDE,
        DELETE;

        void apply(Question question) {
            if (this == HIDE) {
                question.hide();
            } else {
                question.deleteByAdmin();
            }
        }

        Snapshot expectedSnapshot(long likeCount) {
            return new Snapshot(this == HIDE ? QuestionStatus.HIDDEN : QuestionStatus.APPROVED,
                    this == DELETE, likeCount);
        }
    }

    private record Fixture(Long questionId, Long categoryId) {
    }

    private record Snapshot(QuestionStatus status, boolean deleted, long likeCount) {
    }

    private record OrderedResults<T, U>(T first, U second) {
    }
}
