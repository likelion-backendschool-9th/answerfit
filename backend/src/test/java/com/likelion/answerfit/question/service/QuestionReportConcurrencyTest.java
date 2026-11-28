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
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.likelion.answerfit.question.auth.QuestionMember;
import com.likelion.answerfit.question.dto.request.CreateQuestionReportRequest;
import com.likelion.answerfit.question.dto.response.QuestionReportResponse;
import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.Question;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.entity.QuestionStatus;
import com.likelion.answerfit.question.entity.ReportStatus;
import com.likelion.answerfit.question.exception.QuestionErrorCode;
import com.likelion.answerfit.question.exception.QuestionException;
import com.likelion.answerfit.question.repository.CategoryRepository;
import com.likelion.answerfit.question.repository.QuestionRepository;
import com.likelion.answerfit.user.entity.Role;

import jakarta.persistence.EntityManager;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE, properties = {
        "answerfit.question.seed-enabled=false",
        "spring.datasource.url=jdbc:h2:mem:question-report-concurrency;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=3000",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class QuestionReportConcurrencyTest {

    private static final QuestionMember MEMBER = new QuestionMember(1L, Role.USER);

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private QuestionReportService service;

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
        executor = Executors.newFixedThreadPool(2);
        allowCommit = new CountDownLatch(1);
        fixture = transactions.execute(transaction -> {
            Category category = categoryRepository.save(Category.builder().major(QuestionMajor.CS)
                    .name("신고경합-" + UUID.randomUUID()).sortOrder(100).build());
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
                    entityManager.createNativeQuery("delete from question_reports where question_id = :id")
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
    void 동일_회원의_동시_신고는_한_건만_성공하고_첫_신고_내용을_보존한다() {
        AtomicReference<QuestionReportResponse> firstResponse = new AtomicReference<>();

        assertThatThrownBy(() -> runInOrder(() -> {
            QuestionReportResponse response = report(MEMBER, "WRONG_QUESTION", "  처음 신고 내용  ");
            firstResponse.set(response);
            return response;
        }, () -> report(MEMBER, "DUPLICATE", "다시 제출한 내용")))
                .isInstanceOfSatisfying(ExecutionException.class, failure ->
                        assertThat(failure.getCause()).isInstanceOfSatisfying(QuestionException.class,
                                exception -> assertThat(exception.getErrorCode())
                                        .isEqualTo(QuestionErrorCode.ALREADY_REPORTED)));

        assertThat(firstResponse.get().status()).isEqualTo(ReportStatus.PENDING);
        assertThat(reports()).containsExactly(new ReportRow(firstResponse.get().id(), 1L,
                "WRONG_QUESTION", "처음 신고 내용", ReportStatus.PENDING));
        assertThat(snapshot()).isEqualTo(new Snapshot(QuestionStatus.APPROVED, false, 1));
    }

    @Test
    void 서로_다른_회원의_동시_신고는_각각_한_건씩_저장한다() throws Exception {
        CountDownLatch ready = new CountDownLatch(2);
        List<Future<QuestionReportResponse>> requests = new ArrayList<>();
        for (long userId : new long[] {1, 2}) {
            QuestionMember member = new QuestionMember(userId, Role.USER);
            requests.add(executor.submit(() -> {
                ready.countDown();
                await(allowCommit);
                return report(member, "ETC", "회원 " + member.userId() + "의 신고");
            }));
        }
        await(ready);
        allowCommit.countDown();

        List<String> ids = new ArrayList<>();
        for (Future<QuestionReportResponse> request : requests) {
            QuestionReportResponse response = request.get(5, TimeUnit.SECONDS);
            ids.add(response.id());
            assertThat(response.status()).isEqualTo(ReportStatus.PENDING);
        }
        assertThat(ids).doesNotHaveDuplicates();
        assertThat(reports()).extracting(ReportRow::reporterId).containsExactlyInAnyOrder(1L, 2L);
        assertThat(snapshot()).isEqualTo(new Snapshot(QuestionStatus.APPROVED, false, 2));
    }

    @ParameterizedTest
    @EnumSource(ModerationAction.class)
    void 관리자_숨김이나_삭제가_먼저면_기다린_신고는_404로_거절되고_저장하지_않는다(
            ModerationAction action) {
        assertThatThrownBy(() -> runInOrder(() -> {
            Question question = questionRepository.findForUpdateById(fixture.questionId()).orElseThrow();
            action.apply(question);
            return true;
        }, () -> report(MEMBER, "ETC", "신고 내용")))
                .isInstanceOfSatisfying(ExecutionException.class, failure ->
                        assertThat(failure.getCause()).isInstanceOfSatisfying(QuestionException.class,
                                exception -> assertThat(exception.getErrorCode())
                                        .isEqualTo(QuestionErrorCode.QUESTION_NOT_FOUND)));

        assertThat(reports()).isEmpty();
        assertThat(snapshot()).isEqualTo(action.expectedSnapshot(0));
    }

    @ParameterizedTest
    @EnumSource(ModerationAction.class)
    void 신고가_먼저_커밋되면_관리자는_기다린_후_숨기거나_삭제하며_신고를_보존한다(
            ModerationAction action) throws Exception {
        OrderedResults<QuestionReportResponse, Boolean> results = runInOrder(
                () -> report(MEMBER, "ETC", "보존할 신고 내용"),
                () -> transactions.execute(transaction -> {
                    Question question = questionRepository.findForUpdateById(fixture.questionId()).orElseThrow();
                    boolean wasPublic = question.getStatus() == QuestionStatus.APPROVED && question.getDeletedAt() == null;
                    action.apply(question);
                    return wasPublic;
                }));

        assertThat(results.first().status()).isEqualTo(ReportStatus.PENDING);
        assertThat(results.second()).isTrue();
        assertThat(reports()).containsExactly(new ReportRow(results.first().id(), 1L,
                "ETC", "보존할 신고 내용", ReportStatus.PENDING));
        assertThat(snapshot()).isEqualTo(action.expectedSnapshot(1));
    }

    private QuestionReportResponse report(QuestionMember member, String reasonType, String detail) {
        return service.reportQuestion(fixture.questionId(), new CreateQuestionReportRequest(reasonType, detail), member);
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

    private Snapshot snapshot() {
        return transactions.execute(transaction -> {
            Object[] row = (Object[]) entityManager.createNativeQuery("""
                    select question.status, question.deleted_at,
                        (select count(*) from question_reports report where report.question_id = question.id)
                    from questions question where question.id = :id
                    """).setParameter("id", fixture.questionId()).getSingleResult();
            return new Snapshot(QuestionStatus.valueOf((String) row[0]), row[1] != null, ((Number) row[2]).longValue());
        });
    }

    private List<ReportRow> reports() {
        return transactions.execute(transaction -> {
            List<?> values = entityManager.createNativeQuery("""
                    select id, reporter_id, reason_type, reason, status
                    from question_reports where question_id = :id order by id
                    """).setParameter("id", fixture.questionId()).getResultList();
            return values.stream().map(value -> {
                Object[] row = (Object[]) value;
                return new ReportRow(Long.toString(((Number) row[0]).longValue()), ((Number) row[1]).longValue(),
                        (String) row[2], (String) row[3], ReportStatus.valueOf((String) row[4]));
            }).toList();
        });
    }

    private static void await(CountDownLatch latch) {
        try {
            assertThat(latch.await(5, TimeUnit.SECONDS)).isTrue();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new AssertionError("신고 경합 테스트 스레드가 중단되었습니다.", exception);
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

        Snapshot expectedSnapshot(long reportCount) {
            return new Snapshot(this == HIDE ? QuestionStatus.HIDDEN : QuestionStatus.APPROVED,
                    this == DELETE, reportCount);
        }
    }

    private record Fixture(Long questionId, Long categoryId) {
    }

    private record Snapshot(QuestionStatus status, boolean deleted, long reportCount) {
    }

    private record ReportRow(String id, long reporterId, String reasonType, String detail, ReportStatus status) {
    }

    private record OrderedResults<T, U>(T first, U second) {
    }
}
