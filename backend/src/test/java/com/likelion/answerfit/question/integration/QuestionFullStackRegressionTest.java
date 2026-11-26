package com.likelion.answerfit.question.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.likelion.answerfit.auth.kakao.KakaoClient;
import com.likelion.answerfit.auth.kakao.KakaoUser;
import com.likelion.answerfit.auth.service.SocialLoginService;
import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.ModerationType;
import com.likelion.answerfit.question.entity.Question;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.entity.QuestionModeration;
import com.likelion.answerfit.question.entity.QuestionStatus;

import jakarta.persistence.EntityManager;
import tools.jackson.databind.json.JsonMapper;

/** 실제 HTTP 서버와 프론트 모듈을 함께 검증한다. 카카오 네트워크 경계만 대체한다. */
@Tag("full-stack")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "server.address=127.0.0.1",
        "answerfit.question.seed-enabled=true",
        "spring.datasource.url=jdbc:h2:mem:question-fullstack;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "answerfit.jwt.secret=question-fullstack-test-signing-key-at-least-32-bytes"})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class QuestionFullStackRegressionTest {

    private static final String OWNER_CODE = "fixture-owner-code";
    private static final String OTHER_CODE = "fixture-other-code";
    private static final String CALLBACK_URI = "http://frontend-regression.test/auth/kakao/callback";
    private static final long REVIEWER_ID = 999L;
    private static final int PROCESS_TIMEOUT_SECONDS = 60;
    private static final int LOG_TAIL_LINES = 100;

    @LocalServerPort
    private int port;

    @Autowired
    private SocialLoginService socialLoginService;

    @Autowired
    private JwtDecoder jwtDecoder;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JsonMapper jsonMapper;

    @MockitoBean
    private KakaoClient kakaoClient;

    @TempDir
    private Path temporaryDirectory;

    @Test
    void 실제_로그인과_질문_API를_프론트_조회와_액션으로_연결한다() throws Exception {
        Path frontend = frontendDirectory();
        Path vitest = frontend.resolve("node_modules/.bin/vitest");
        assertThat(vitest).as("프론트 의존성을 먼저 설치해야 합니다: frontend/node_modules/.bin/vitest").isRegularFile();
        assertThat(Files.isExecutable(vitest)).as("Vitest 실행 파일에 실행 권한이 필요합니다").isTrue();
        assertThat(frontend.resolve("vitest.integration.config.mts"))
                .as("프론트 실제 HTTP 통합 테스트 설정이 필요합니다").isRegularFile();

        when(kakaoClient.fetchUser(OWNER_CODE, CALLBACK_URI))
                .thenReturn(new KakaoUser("fixture-owner-account", "fixture-owner@example.com", true, "회귀작성자"));
        when(kakaoClient.fetchUser(OTHER_CODE, CALLBACK_URI))
                .thenReturn(new KakaoUser("fixture-other-account", "fixture-other@example.com", true, "회귀다른회원"));

        // 실제 가입·소셜 계정 연결·JWT 발급을 거쳐 얻은 ID로만 fixture의 작성자를 정한다.
        Long ownerId = memberId(socialLoginService.loginWithKakao(OWNER_CODE, CALLBACK_URI));
        Long otherId = memberId(socialLoginService.loginWithKakao(OTHER_CODE, CALLBACK_URI));
        Fixture fixture = new TransactionTemplate(transactionManager)
                .execute(status -> seedQuestions(ownerId, otherId));
        assertThat(fixture).isNotNull();

        Path fixtureFile = temporaryDirectory.resolve("question-fullstack-fixture.json");
        Files.writeString(fixtureFile, jsonMapper.writeValueAsString(fixture), StandardCharsets.UTF_8);
        runFrontend(frontend, vitest, fixtureFile);
    }

    private Fixture seedQuestions(Long ownerId, Long otherId) {
        Category operatingSystem = category(QuestionMajor.CS, "운영체제");
        Category network = category(QuestionMajor.CS, "네트워크");

        Question rejected = persist(Question.createByUser(QuestionMajor.CS, operatingSystem,
                "반려된 프로세스 질문의 범위를 설명해 주세요.", ownerId));
        rejected.reject(REVIEWER_ID);
        entityManager.persist(QuestionModeration.builder().question(rejected).moderationType(ModerationType.REJECT)
                .reason("범위를 구체적으로 작성해 주세요.").moderatorId(REVIEWER_ID).build());
        persist(Question.createByUser(QuestionMajor.CS, operatingSystem,
                "아직 승인되지 않은 작성자의 질문입니다.", ownerId));

        Question pendingAnswer = approvedUserQuestion(operatingSystem, "프로세스가 실행되는 과정을 설명해 주세요.", otherId);
        Question failedAnswer = approvedUserQuestion(operatingSystem, "모범답안 생성 실패 상태를 설명해 주세요.", otherId);
        failedAnswer.failModelAnswer();
        Question doneAnswer = approvedUserQuestion(operatingSystem, "프로세스와 스레드의 차이를 설명해 주세요.", otherId);
        doneAnswer.completeModelAnswer("첫 문단입니다.\n\n나머지 설명입니다.");
        doneAnswer.addKeyword("프로세스");
        doneAnswer.addKeyword("스레드");

        for (int index = 0; index < 8; index++) {
            persist(Question.createByAdmin(QuestionMajor.CS, index % 2 == 0 ? operatingSystem : network,
                    "공개 회귀 질문 " + (index + 1) + "의 내용을 설명해 주세요.", null, null, REVIEWER_ID));
        }
        Question hidden = persist(Question.createByAdmin(QuestionMajor.CS, operatingSystem,
                "숨겨진 질문의 비공개 내용을 설명해 주세요.", null, null, REVIEWER_ID));
        hidden.hide();
        Question deleted = persist(Question.createByAdmin(QuestionMajor.CS, operatingSystem,
                "삭제된 질문의 비공개 내용을 설명해 주세요.", null, null, REVIEWER_ID));
        deleted.deleteByAdmin();

        Question personality = persist(Question.createByAdmin(QuestionMajor.PERSONALITY, null,
                "팀에서 갈등을 해결한 경험을 설명해 주세요.", null, null, REVIEWER_ID));
        persist(Question.createByAdmin(QuestionMajor.PERSONALITY, category(QuestionMajor.PERSONALITY, "협업"),
                "동료와 협업하며 배운 경험을 설명해 주세요.", null, null, REVIEWER_ID));
        entityManager.flush();
        assertThat(publicCount(QuestionMajor.CS)).isEqualTo(11);
        assertThat(publicCount(QuestionMajor.PERSONALITY)).isEqualTo(2);

        return new Fixture("http://127.0.0.1:" + port, OWNER_CODE, OTHER_CODE,
                operatingSystem.getId().toString(), network.getId().toString(), rejected.getId().toString(),
                pendingAnswer.getId().toString(), failedAnswer.getId().toString(), doneAnswer.getId().toString(),
                hidden.getId().toString(), deleted.getId().toString(), personality.getId().toString(), 11, 2);
    }

    private Question approvedUserQuestion(Category category, String content, Long authorId) {
        Question question = persist(Question.createByUser(QuestionMajor.CS, category, content, authorId));
        question.approve(REVIEWER_ID);
        return question;
    }

    private Question persist(Question question) {
        entityManager.persist(question);
        return question;
    }

    private Category category(QuestionMajor major, String name) {
        return entityManager.createQuery("select c from Category c where c.major = :major and c.name = :name", Category.class)
                .setParameter("major", major).setParameter("name", name).getSingleResult();
    }

    private long publicCount(QuestionMajor major) {
        return entityManager.createQuery("""
                select count(q) from Question q
                where q.major = :major and q.status = :status and q.deletedAt is null
                """, Long.class).setParameter("major", major).setParameter("status", QuestionStatus.APPROVED)
                .getSingleResult();
    }

    private Long memberId(String token) {
        return Long.valueOf(jwtDecoder.decode(token).getSubject());
    }

    private static Path frontendDirectory() {
        Path current = Path.of(System.getProperty("user.dir")).toAbsolutePath().normalize();
        Path frontend = current.getFileName().toString().equals("backend")
                ? current.resolveSibling("frontend") : current.resolve("frontend");
        assertThat(frontend.resolve("package.json"))
                .as("backend와 같은 저장소의 frontend 디렉터리를 찾을 수 있어야 합니다").isRegularFile();
        return frontend;
    }

    private void runFrontend(Path frontend, Path vitest, Path fixtureFile) throws Exception {
        Path output = temporaryDirectory.resolve("question-fullstack-vitest.log");
        ProcessBuilder builder = new ProcessBuilder(vitest.toString(), "run", "--config", "vitest.integration.config.mts")
                .directory(frontend.toFile()).redirectErrorStream(true).redirectOutput(output.toFile());
        builder.environment().put("ANSWERFIT_INTEGRATION_FIXTURE", fixtureFile.toString());
        Process process;
        try {
            process = builder.start();
        } catch (IOException exception) {
            throw new AssertionError("Vitest를 실행하지 못했습니다. Node.js와 frontend 의존성을 확인해 주세요.", exception);
        }
        try {
            if (!process.waitFor(PROCESS_TIMEOUT_SECONDS, TimeUnit.SECONDS)) {
                stopProcess(process);
                throw new AssertionError("프론트 실제 HTTP 회귀 테스트가 60초 안에 끝나지 않았습니다.\n" + logTail(output));
            }
            assertThat(process.exitValue()).withFailMessage(
                    "프론트 실제 HTTP 회귀 테스트에 실패했습니다.\n%s", logTail(output)).isZero();
            printSummary(output);
        } finally {
            stopProcess(process);
        }
    }

    private static void stopProcess(Process process) {
        process.descendants().forEach(child -> {
            if (child.isAlive()) child.destroyForcibly();
        });
        if (process.isAlive()) process.destroyForcibly();
        try {
            process.waitFor(5, TimeUnit.SECONDS);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        }
    }

    private static void printSummary(Path output) throws IOException {
        // 합성 회귀 테스트의 건수만 보고한다. 요청·회원·토큰 값은 출력하지 않는다.
        Files.readAllLines(output, StandardCharsets.UTF_8).stream()
                .map(line -> line.replaceAll("\u001B\\[[0-?]*[ -/]*[@-~]", "").strip())
                .filter(line -> line.matches("(?:Test Files|Tests)\\s+\\d+ passed.*"))
                .forEach(System.out::println);
    }

    private static String logTail(Path output) throws IOException {
        var lines = Files.readAllLines(output, StandardCharsets.UTF_8);
        String tail = String.join("\n", lines.subList(Math.max(0, lines.size() - LOG_TAIL_LINES), lines.size()));
        return tail.replaceAll("[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}", "<redacted-jwt>");
    }

    private record Fixture(String backendUrl, String ownerCode, String otherCode, String categoryId,
            String alternateCategoryId, String rejectedQuestionId, String pendingAnswerId, String failedAnswerId,
            String doneAnswerId, String hiddenQuestionId, String deletedQuestionId, String personalityQuestionId,
            int publicCsCount, int publicPersonalityCount) {
    }
}
