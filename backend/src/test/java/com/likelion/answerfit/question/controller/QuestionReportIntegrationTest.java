package com.likelion.answerfit.question.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.likelion.answerfit.question.auth.QuestionPrincipal;
import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.ModerationType;
import com.likelion.answerfit.question.entity.Question;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.entity.QuestionModeration;
import com.likelion.answerfit.question.entity.QuestionReport;
import com.likelion.answerfit.question.entity.QuestionStatus;
import com.likelion.answerfit.question.entity.ReportReasonType;
import com.likelion.answerfit.question.entity.ReportStatus;
import com.likelion.answerfit.question.repository.QuestionReportRepository;
import com.likelion.answerfit.user.entity.Role;
import com.likelion.answerfit.user.entity.UserStatus;

import jakarta.persistence.EntityManager;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class QuestionReportIntegrationTest {

    private static final String PATH = "/api/v1/learning/questions/{id}/reports";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private QuestionReportRepository questionReportRepository;

    @ParameterizedTest
    @EnumSource(ReportReasonType.class)
    void 다섯_사유는_인증_회원의_PENDING_신고로_저장하고_질문의_승인_상태는_유지한다(ReportReasonType reason) throws Exception {
        Question question = approvedQuestion(2L);
        flushAndClear();
        Instant reviewedAt = entityManager.createQuery("select q.reviewedAt from Question q where q.id = :id", Instant.class)
                .setParameter("id", question.getId()).getSingleResult();

        String response = submit(question.getId(), Map.of("reasonType", reason.name(), "detail", "\uFEFF  신고 상세 \u00A0",
                        "reporterId", 999L, "questionId", Long.MAX_VALUE, "status", "ACCEPTED", "handledBy", 999L), Role.USER)
                .andExpect(status().isCreated()).andExpect(jsonPath("$.id").isString())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn().getResponse().getContentAsString();
        flushAndClear();

        Long id = Long.valueOf(objectMapper.readTree(response).get("id").asText());
        QuestionReport saved = questionReportRepository.findById(id).orElseThrow();
        assertThat(saved.getQuestion().getId()).isEqualTo(question.getId());
        assertThat(saved.getReporterId()).isEqualTo(1L);
        assertThat(saved.getReasonType()).isEqualTo(reason);
        assertThat(saved.getReason()).isEqualTo("신고 상세");
        assertThat(saved.getStatus()).isEqualTo(ReportStatus.PENDING);
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getHandledBy()).isNull();
        assertThat(saved.getHandledAt()).isNull();
        assertThat(saved.getModeration()).isNull();
        Question preserved = entityManager.find(Question.class, question.getId());
        assertThat(preserved.getStatus()).isEqualTo(QuestionStatus.APPROVED);
        assertThat(preserved.getReviewedAt()).isEqualTo(reviewedAt);
    }

    @ParameterizedTest
    @ValueSource(strings = {"OMITTED", "NULL", "BLANK", "MAX"})
    void 상세_사유는_선택이며_이모지_300자도_저장한다(String scenario) throws Exception {
        Question question = approvedQuestion(2L);
        flushAndClear();
        Map<String, Object> body = new HashMap<>();
        body.put("reasonType", "ETC");
        if (!scenario.equals("OMITTED")) {
            body.put("detail", scenario.equals("NULL") ? null
                    : scenario.equals("MAX") ? " \u00A0" + "😀".repeat(300) + "\uFEFF " : "\uFEFF \n\u00A0");
        }

        submit(question.getId(), body, Role.USER).andExpect(status().isCreated());
        flushAndClear();

        QuestionReport saved = questionReportRepository.findAll().getFirst();
        assertThat(saved.getReason()).isEqualTo(scenario.equals("MAX") ? "😀".repeat(300) : "");
    }

    @ParameterizedTest
    @ValueSource(strings = {"가", "😀"})
    void 상세_사유_301자는_신고를_저장하지_않는다(String character) throws Exception {
        Question question = approvedQuestion(2L);
        flushAndClear();

        submit(question.getId(), Map.of("reasonType", "WRONG_QUESTION", "detail", character.repeat(301)), Role.USER)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        assertThat(questionReportRepository.count()).isZero();
    }

    @ParameterizedTest
    @EnumSource(ReportStatus.class)
    void 처리_상태와_관계없이_같은_회원의_재신고는_기존_행을_보존하며_거절한다(ReportStatus reportStatus) throws Exception {
        Question question = approvedQuestion(2L);
        QuestionReport original = QuestionReport.builder().question(question).reporterId(1L)
                .reasonType(ReportReasonType.WRONG_ANSWER).reason("최초 신고 사유").build();
        if (reportStatus == ReportStatus.DISMISSED) original.dismiss(99L);
        if (reportStatus == ReportStatus.ACCEPTED) {
            QuestionModeration moderation = QuestionModeration.builder().question(question).moderationType(ModerationType.REPORT)
                    .moderatorId(99L).reason("기존 신고 조치").build();
            entityManager.persist(moderation);
            original.accept(moderation, 99L);
        }
        entityManager.persist(original);
        flushAndClear();

        submit(question.getId(), Map.of("reasonType", "ETC", "detail", "바뀐 사유"), Role.USER)
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ALREADY_REPORTED"));
        entityManager.clear();

        assertThat(questionReportRepository.count()).isEqualTo(1);
        QuestionReport saved = questionReportRepository.findById(original.getId()).orElseThrow();
        assertThat(saved.getReason()).isEqualTo("최초 신고 사유");
        assertThat(saved.getReasonType()).isEqualTo(ReportReasonType.WRONG_ANSWER);
        assertThat(saved.getStatus()).isEqualTo(reportStatus);
    }

    @Test
    void 신고_후_목록과_상세의_본인_신고_표시만_바뀌고_다른_회원은_계속_신고할_수_있다() throws Exception {
        Question question = approvedQuestion(2L);
        flushAndClear();
        submit(question.getId(), Map.of("reasonType", "DUPLICATE"), Role.USER).andExpect(status().isCreated());
        flushAndClear();

        mockMvc.perform(get("/api/v1/learning/questions/{id}", question.getId()).principal(actor(1L, Role.USER)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.isReported").value(true))
                .andExpect(jsonPath("$.canReport").value(false)).andExpect(jsonPath("$.likeCount").value(0));
        mockMvc.perform(get("/api/v1/learning/questions").principal(actor(1L, Role.USER)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalCount").value(1))
                .andExpect(jsonPath("$.items[0].isReported").value(true));
        mockMvc.perform(get("/api/v1/learning/questions/{id}", question.getId()).principal(actor(3L, Role.USER)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.isReported").value(false))
                .andExpect(jsonPath("$.canReport").value(true));
    }

    @Test
    void 인성_ADMIN_출처_질문은_등록한_관리자도_일반_신고를_할_수_있다() throws Exception {
        Question question = Question.createByAdmin(QuestionMajor.PERSONALITY, null, "협업 중 갈등을 해결한 경험을 말해주세요.",
                null, null, 1L);
        entityManager.persist(question);
        flushAndClear();
        submit(question.getId(), Map.of("reasonType", "INAPPROPRIATE"), Role.ADMIN).andExpect(status().isCreated());
        flushAndClear();
        assertThat(questionReportRepository.findAll().getFirst().getReporterId()).isEqualTo(1L);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("deniedQuestions")
    void 본인_또는_비공개_질문은_신고하지_못한다(String scenario, Role role, int httpStatus, String code) throws Exception {
        Question question = null;
        if (!scenario.equals("MISSING")) {
            question = userQuestion(scenario.startsWith("OWN") ? 1L : 2L);
            if (scenario.endsWith("APPROVED") || scenario.endsWith("HIDDEN") || scenario.endsWith("DELETED")) question.approve(99L);
            if (scenario.endsWith("REJECTED")) question.reject(99L);
            if (scenario.endsWith("HIDDEN")) question.hide();
            if (scenario.endsWith("DELETED")) question.deleteByAdmin();
        }
        Long id = question == null ? Long.MAX_VALUE : question.getId();
        flushAndClear();

        submit(id, Map.of("reasonType", "ETC"), role)
                .andExpect(status().is(httpStatus)).andExpect(jsonPath("$.code").value(code));
        entityManager.clear();
        assertThat(questionReportRepository.count()).isZero();
    }

    @ParameterizedTest
    @ValueSource(strings = {"MISSING", "NULL", "", "wrong_answer", "UNKNOWN", " WRONG_ANSWER "})
    void 없는_사유와_정확하지_않은_사유_코드는_400이다(String reasonType) throws Exception {
        Question question = approvedQuestion(2L);
        flushAndClear();
        Map<String, Object> body = new HashMap<>();
        if (!reasonType.equals("MISSING")) body.put("reasonType", reasonType.equals("NULL") ? null : reasonType);

        submit(question.getId(), body, Role.USER).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REPORT_REASON"));
        assertThat(questionReportRepository.count()).isZero();
    }

    private ResultActions submit(Long id, Map<String, Object> body, Role role) throws Exception {
        return mockMvc.perform(post(PATH, id).principal(actor(1L, role)).contentType(MediaType.APPLICATION_JSON)
                .header("X-User-Id", "999").queryParam("userId", "999").content(objectMapper.writeValueAsString(body)));
    }

    private Question approvedQuestion(long authorId) {
        Question question = userQuestion(authorId);
        question.approve(99L);
        return question;
    }

    private Question userQuestion(long authorId) {
        Category category = entityManager.createQuery(
                        "select c from Category c where c.major = :major and c.name = :name", Category.class)
                .setParameter("major", QuestionMajor.CS).setParameter("name", "운영체제").getSingleResult();
        Question question = Question.createByUser(QuestionMajor.CS, category, "프로세스와 스레드의 차이는 무엇인가요?", authorId);
        entityManager.persist(question);
        return question;
    }

    private void flushAndClear() {
        entityManager.flush();
        entityManager.clear();
    }

    private static QuestionPrincipal actor(long id, Role role) {
        return new TestPrincipal(id, role, UserStatus.ACTIVE, null);
    }

    private static Stream<Arguments> deniedQuestions() {
        return Stream.of(Arguments.of("OWN_APPROVED", Role.USER, 403, "SELF_REPORT_NOT_ALLOWED"),
                Arguments.of("OWN_APPROVED", Role.ADMIN, 403, "SELF_REPORT_NOT_ALLOWED"),
                Arguments.of("OWN_PENDING", Role.USER, 404, "QUESTION_NOT_FOUND"),
                Arguments.of("OTHER_PENDING", Role.ADMIN, 404, "QUESTION_NOT_FOUND"),
                Arguments.of("OTHER_REJECTED", Role.USER, 404, "QUESTION_NOT_FOUND"),
                Arguments.of("OTHER_HIDDEN", Role.USER, 404, "QUESTION_NOT_FOUND"),
                Arguments.of("OTHER_DELETED", Role.USER, 404, "QUESTION_NOT_FOUND"),
                Arguments.of("MISSING", Role.USER, 404, "QUESTION_NOT_FOUND"));
    }

    private record TestPrincipal(Long userId, Role role, UserStatus status, Instant deletedAt) implements QuestionPrincipal {
    }
}
