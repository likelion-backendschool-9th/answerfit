package com.likelion.answerfit.question.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.likelion.answerfit.question.auth.QuestionMember;
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
        "spring.datasource.url=jdbc:h2:mem:question-delete-concurrency;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=3000",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class QuestionDeleteConcurrencyTest {

    private static final String CONTENT = "프로세스와 스레드의 차이를 설명해주세요.";
    private static final QuestionMember AUTHOR = new QuestionMember(1L, Role.USER);

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private QuestionCommandService service;

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
                    .name("삭제경합-" + UUID.randomUUID()).sortOrder(100).build());
            Question question = questionRepository.save(Question.createByUser(
                    QuestionMajor.CS, category, CONTENT, AUTHOR.userId()));
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
                    entityManager.createNativeQuery("delete from questions where id = :id")
                            .setParameter("id", fixture.questionId()).executeUpdate();
                    entityManager.createNativeQuery("delete from categories where id = :id")
                            .setParameter("id", fixture.categoryId()).executeUpdate();
                });
            }
        }
    }

    @Test
    void 관리자_승인이_먼저_잠그면_기다린_삭제는_거절되고_승인_질문은_보존된다() throws Exception {
        CountDownLatch approvedWhileLocked = new CountDownLatch(1);
        CountDownLatch deleteStarted = new CountDownLatch(1);
        Future<?> approval = executor.submit(() -> transactions.executeWithoutResult(transaction -> {
            Question question = questionRepository.findForUpdateById(fixture.questionId()).orElseThrow();
            question.approve(99L);
            entityManager.flush();
            approvedWhileLocked.countDown();
            await(allowCommit);
        }));
        await(approvedWhileLocked);

        Future<?> deletion = executor.submit(() -> {
            deleteStarted.countDown();
            service.deleteQuestion(fixture.questionId(), AUTHOR);
        });
        await(deleteStarted);
        assertBlocked(deletion);
        allowCommit.countDown();
        approval.get(5, TimeUnit.SECONDS);

        assertThatThrownBy(() -> deletion.get(5, TimeUnit.SECONDS))
                .isInstanceOfSatisfying(ExecutionException.class, failure ->
                        assertThat(failure.getCause()).isInstanceOfSatisfying(QuestionException.class,
                                exception -> assertThat(exception.getErrorCode())
                                        .isEqualTo(QuestionErrorCode.QUESTION_NOT_EDITABLE)));
        assertThat(snapshot()).isEqualTo(new Snapshot(QuestionStatus.APPROVED, CONTENT, false, 99L));
    }

    @Test
    void 삭제가_먼저_잠그면_관리자는_커밋_후_삭제된_질문을_승인할_수_없다() throws Exception {
        CountDownLatch deletedWhileLocked = new CountDownLatch(1);
        CountDownLatch approvalStarted = new CountDownLatch(1);
        Future<?> deletion = executor.submit(() -> transactions.executeWithoutResult(transaction -> {
            service.deleteQuestion(fixture.questionId(), AUTHOR);
            entityManager.flush();
            deletedWhileLocked.countDown();
            await(allowCommit);
        }));
        await(deletedWhileLocked);

        Future<Boolean> approval = executor.submit(() -> transactions.execute(transaction -> {
            approvalStarted.countDown();
            Optional<Question> question = questionRepository.findForUpdateById(fixture.questionId());
            question.ifPresent(found -> found.approve(99L));
            return question.isPresent();
        }));
        await(approvalStarted);
        assertBlocked(approval);
        allowCommit.countDown();

        deletion.get(5, TimeUnit.SECONDS);
        assertThat(approval.get(5, TimeUnit.SECONDS)).isFalse();
        assertThat(snapshot()).isEqualTo(new Snapshot(QuestionStatus.PENDING, CONTENT, true, null));
    }

    private Snapshot snapshot() {
        return transactions.execute(transaction -> {
            Object[] row = (Object[]) entityManager.createNativeQuery("""
                    select status, content, deleted_at, reviewed_by from questions where id = :id
                    """).setParameter("id", fixture.questionId()).getSingleResult();
            Long reviewedBy = row[3] == null ? null : ((Number) row[3]).longValue();
            return new Snapshot(QuestionStatus.valueOf((String) row[0]), (String) row[1], row[2] != null, reviewedBy);
        });
    }

    private static void assertBlocked(Future<?> future) {
        assertThatThrownBy(() -> future.get(200, TimeUnit.MILLISECONDS)).isInstanceOf(TimeoutException.class);
    }

    private static void await(CountDownLatch latch) {
        try {
            assertThat(latch.await(5, TimeUnit.SECONDS)).isTrue();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new AssertionError("삭제 경합 테스트 스레드가 중단되었습니다.", exception);
        }
    }

    private record Fixture(Long questionId, Long categoryId) {
    }

    private record Snapshot(QuestionStatus status, String content, boolean deleted, Long reviewedBy) {
    }
}
