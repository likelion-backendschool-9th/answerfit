package com.likelion.answerfit.question.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
import com.likelion.answerfit.question.dto.request.UpdateQuestionRequest;
import com.likelion.answerfit.question.dto.response.QuestionUpdateResponse;
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
        "spring.datasource.url=jdbc:h2:mem:question-update-concurrency;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=3000",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class QuestionUpdateConcurrencyTest {

    private static final String ORIGINAL = "프로세스와 스레드의 차이를 설명해주세요.";
    private static final String UPDATED = "프로세스와 스레드의 메모리 공유 차이를 설명해주세요.";
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
                    .name("경합-" + UUID.randomUUID()).sortOrder(100).build());
            Question question = questionRepository.save(Question.createByUser(
                    QuestionMajor.CS, category, ORIGINAL, AUTHOR.userId()));
            return new Fixture(question.getId(), category.getId());
        });
    }

    @AfterEach
    void cleanUp() throws InterruptedException {
        allowCommit.countDown();
        executor.shutdownNow();
        assertThat(executor.awaitTermination(5, TimeUnit.SECONDS)).isTrue();
        transactions.executeWithoutResult(transaction -> {
            questionRepository.deleteById(fixture.questionId());
            questionRepository.flush();
            categoryRepository.deleteById(fixture.categoryId());
        });
    }

    @Test
    void 관리자_승인이_먼저_잠그면_커밋을_기다린_수정은_거절된다() throws Exception {
        CountDownLatch approvedWhileLocked = new CountDownLatch(1);
        CountDownLatch updateStarted = new CountDownLatch(1);
        Future<?> approval = executor.submit(() -> transactions.executeWithoutResult(transaction -> {
            Question question = questionRepository.findForUpdateById(fixture.questionId()).orElseThrow();
            question.approve(99L);
            entityManager.flush();
            approvedWhileLocked.countDown();
            await(allowCommit);
        }));
        await(approvedWhileLocked);

        Future<QuestionUpdateResponse> update = executor.submit(() -> {
            updateStarted.countDown();
            return service.updateQuestion(fixture.questionId(), new UpdateQuestionRequest(null, UPDATED), AUTHOR);
        });
        await(updateStarted);
        assertBlocked(update);
        allowCommit.countDown();
        approval.get(5, TimeUnit.SECONDS);

        assertThatThrownBy(() -> update.get(5, TimeUnit.SECONDS))
                .isInstanceOfSatisfying(ExecutionException.class, failure -> {
                    assertThat(failure.getCause()).isInstanceOfSatisfying(QuestionException.class,
                            exception -> assertThat(exception.getErrorCode())
                                    .isEqualTo(QuestionErrorCode.QUESTION_NOT_EDITABLE));
                });
        assertThat(snapshot()).isEqualTo(new Snapshot(QuestionStatus.APPROVED, ORIGINAL, 99L));
    }

    @Test
    void 사용자_수정이_먼저_잠그면_관리자는_커밋된_최신_본문을_승인한다() throws Exception {
        CountDownLatch updatedWhileLocked = new CountDownLatch(1);
        CountDownLatch approvalStarted = new CountDownLatch(1);
        Future<QuestionUpdateResponse> update = executor.submit(() -> transactions.execute(transaction -> {
            QuestionUpdateResponse response = service.updateQuestion(
                    fixture.questionId(), new UpdateQuestionRequest(null, UPDATED), AUTHOR);
            entityManager.flush();
            updatedWhileLocked.countDown();
            await(allowCommit);
            return response;
        }));
        await(updatedWhileLocked);

        Future<String> approval = executor.submit(() -> transactions.execute(transaction -> {
            approvalStarted.countDown();
            Question question = questionRepository.findForUpdateById(fixture.questionId()).orElseThrow();
            String contentSeenAfterLock = question.getContent();
            question.approve(99L);
            return contentSeenAfterLock;
        }));
        await(approvalStarted);
        assertBlocked(approval);
        allowCommit.countDown();

        assertThat(update.get(5, TimeUnit.SECONDS).status()).isEqualTo(QuestionStatus.PENDING);
        assertThat(approval.get(5, TimeUnit.SECONDS)).isEqualTo(UPDATED);
        assertThat(snapshot()).isEqualTo(new Snapshot(QuestionStatus.APPROVED, UPDATED, 99L));
    }

    private Snapshot snapshot() {
        return transactions.execute(transaction -> {
            Question question = questionRepository.findById(fixture.questionId()).orElseThrow();
            return new Snapshot(question.getStatus(), question.getContent(), question.getReviewedBy());
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
            throw new AssertionError("경합 테스트 스레드가 중단되었습니다.", exception);
        }
    }

    private record Fixture(Long questionId, Long categoryId) {
    }

    private record Snapshot(QuestionStatus status, String content, Long reviewedBy) {
    }
}
