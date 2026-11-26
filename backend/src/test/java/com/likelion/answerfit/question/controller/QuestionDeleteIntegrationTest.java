package com.likelion.answerfit.question.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.likelion.answerfit.interview.entity.CompanyType;
import com.likelion.answerfit.interview.entity.InterviewQuestion;
import com.likelion.answerfit.interview.entity.InterviewSession;
import com.likelion.answerfit.interview.entity.InterviewType;
import com.likelion.answerfit.interview.entity.RunMode;
import com.likelion.answerfit.question.auth.QuestionPrincipal;
import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.ModerationType;
import com.likelion.answerfit.question.entity.Question;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.entity.QuestionModeration;
import com.likelion.answerfit.question.entity.QuestionReport;
import com.likelion.answerfit.question.entity.QuestionStatus;
import com.likelion.answerfit.question.entity.ReportReasonType;
import com.likelion.answerfit.question.repository.QuestionRepository;
import com.likelion.answerfit.user.entity.Role;
import com.likelion.answerfit.user.entity.UserStatus;

import jakarta.persistence.EntityManager;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class QuestionDeleteIntegrationTest {

    private static final String PATH = "/api/v1/learning/questions/{id}";
    private static final String CONTENT = "프로세스와 스레드의 차이는 무엇인가요?";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private QuestionRepository questionRepository;

    @ParameterizedTest
    @MethodSource("editableQuestions")
    void 본인_미승인_질문은_물리_행과_원본_정보를_보존하고_삭제_후_모든_접근을_차단한다(
            QuestionStatus initialStatus, Role role) throws Exception {
        Question question = userQuestion(1L);
        if (initialStatus == QuestionStatus.REJECTED) question.reject(99L);
        flushAndClear();
        Object[] original = originalFields(question.getId());

        mockMvc.perform(delete(PATH, question.getId()).principal(actor(1L, role)))
                .andExpect(status().isNoContent()).andExpect(content().string(""));
        flushAndClear();

        assertThat(originalFields(question.getId())).containsExactly(original);
        assertThat(deletedCount(question.getId())).isEqualTo(1);
        assertThat(questionRepository.findById(question.getId())).isEmpty();
        for (QuestionPrincipal viewer : new QuestionPrincipal[] {
                actor(1L, Role.USER), actor(2L, Role.USER), actor(99L, Role.ADMIN)}) {
            mockMvc.perform(get(PATH, question.getId()).principal(viewer))
                    .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("QUESTION_NOT_FOUND"));
        }
        mockMvc.perform(patch(PATH, question.getId()).principal(actor(1L, role))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"삭제 이후에 수정을 시도하는 질문입니다.\"}"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("QUESTION_NOT_FOUND"));
        mockMvc.perform(delete(PATH, question.getId()).principal(actor(1L, role)))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("QUESTION_NOT_FOUND"));
        assertThat(deletedCount(question.getId())).isEqualTo(1);
    }

    @Test
    void 삭제는_키워드_신고_검토_이력과_과거_면접의_질문_답변_스냅샷을_지우지_않는다() throws Exception {
        Question question = userQuestion(1L);
        question.reject(99L);
        question.addKeyword("프로세스");
        QuestionModeration moderation = QuestionModeration.builder().question(question)
                .moderationType(ModerationType.REJECT).moderatorId(99L).reason("기존 반려 사유").build();
        entityManager.persist(moderation);
        QuestionReport report = QuestionReport.builder().question(question).reporterId(2L)
                .reasonType(ReportReasonType.ETC).reason("기존 신고 내용").build();
        entityManager.persist(report);
        InterviewSession session = InterviewSession.builder().runMode(RunMode.PRACTICE)
                .companyType(CompanyType.PRIVATE).build();
        entityManager.persist(session);
        // 과거 데이터가 연결되어 있어도 삭제는 기존 기록에 전파되지 않아야 한다.
        InterviewQuestion snapshot = InterviewQuestion.createFromBank(session, InterviewType.CS, (short) 1,
                question.getId(), "면접 당시 질문 원문", "면접 당시 힌트");
        snapshot.recordAnswer("당시 응시자의 답변", "audio-key", "video-key", (short) 30, (short) 80);
        entityManager.persist(snapshot);
        flushAndClear();

        mockMvc.perform(delete(PATH, question.getId()).principal(actor(1L, Role.USER)))
                .andExpect(status().isNoContent());
        flushAndClear();

        assertThat(deletedCount(question.getId())).isEqualTo(1);
        assertThat(entityManager.createNativeQuery("select keyword from question_keywords where question_id = :id")
                .setParameter("id", question.getId()).getSingleResult()).isEqualTo("프로세스");
        assertThat(entityManager.createNativeQuery("select reason from question_moderations where id = :id")
                .setParameter("id", moderation.getId()).getSingleResult()).isEqualTo("기존 반려 사유");
        Object[] reportRow = (Object[]) entityManager.createNativeQuery(
                "select question_id, reason, status from question_reports where id = :id")
                .setParameter("id", report.getId()).getSingleResult();
        assertThat(reportRow).containsExactly(question.getId(), "기존 신고 내용", "PENDING");
        InterviewQuestion preserved = entityManager.find(InterviewQuestion.class, snapshot.getId());
        assertThat(preserved.getBankQuestionId()).isEqualTo(question.getId());
        assertThat(preserved.getQuestionText()).isEqualTo("면접 당시 질문 원문");
        assertThat(preserved.getHint()).isEqualTo("면접 당시 힌트");
        assertThat(preserved.getAnswerText()).isEqualTo("당시 응시자의 답변");
        assertThat(preserved.getAudioKey()).isEqualTo("audio-key");
        assertThat(preserved.getVideoKey()).isEqualTo("video-key");
        assertThat(preserved.getAnsweredAt()).isNotNull();
    }

    @Test
    void 미승인_질문의_삭제는_공개_목록과_분류_집계를_바꾸지_않는다() throws Exception {
        Question privateQuestion = userQuestion(1L);
        Question publicQuestion = userQuestion(2L);
        publicQuestion.approve(99L);
        flushAndClear();
        String listBefore = publicList();
        String categoriesBefore = categories();

        mockMvc.perform(delete(PATH, privateQuestion.getId()).principal(actor(1L, Role.USER)))
                .andExpect(status().isNoContent());
        flushAndClear();

        assertThat(publicList()).isEqualTo(listBefore);
        assertThat(categories()).isEqualTo(categoriesBefore);
        assertThat(questionRepository.findById(publicQuestion.getId())).isPresent();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("deniedRequests")
    void 권한과_상태가_맞지_않는_삭제는_원문과_삭제_상태를_바꾸지_않는다(
            String scenario, Role role, int httpStatus, String code) throws Exception {
        Question question;
        if (scenario.equals("ADMIN_SOURCE")) {
            question = Question.createByAdmin(QuestionMajor.CS, category(), CONTENT, "관리자 답안", null, 1L);
            entityManager.persist(question);
        } else {
            question = userQuestion(scenario.startsWith("OWN") ? 1L : 2L);
            if (scenario.endsWith("APPROVED") || scenario.endsWith("HIDDEN")) question.approve(99L);
            if (scenario.endsWith("REJECTED")) question.reject(99L);
            if (scenario.endsWith("HIDDEN")) question.hide();
        }
        flushAndClear();
        Object[] original = originalFields(question.getId());

        mockMvc.perform(delete(PATH, question.getId()).principal(actor(1L, role))
                        .header("X-User-Id", question.getAuthorId() == null ? 99L : question.getAuthorId())
                        .queryParam("userId", "2"))
                .andExpect(status().is(httpStatus)).andExpect(jsonPath("$.code").value(code));
        entityManager.clear();

        assertThat(deletedCount(question.getId())).isZero();
        assertThat(originalFields(question.getId())).containsExactly(original);
    }

    private Question userQuestion(long authorId) {
        Question question = Question.createByUser(QuestionMajor.CS, category(), CONTENT, authorId);
        entityManager.persist(question);
        return question;
    }

    private Category category() {
        return entityManager.createQuery("select c from Category c where c.major = :major and c.name = :name", Category.class)
                .setParameter("major", QuestionMajor.CS).setParameter("name", "운영체제").getSingleResult();
    }

    private Object[] originalFields(Long id) {
        return (Object[]) entityManager.createNativeQuery("""
                select category_id, major, content, model_answer, hint, source, author_id, status,
                       reviewed_by, reviewed_at, model_answer_status, created_at from questions where id = :id
                """).setParameter("id", id).getSingleResult();
    }

    private long deletedCount(Long id) {
        return ((Number) entityManager.createNativeQuery(
                "select count(*) from questions where id = :id and deleted_at is not null")
                .setParameter("id", id).getSingleResult()).longValue();
    }

    private String publicList() throws Exception {
        return mockMvc.perform(get("/api/v1/learning/questions").principal(actor(1L, Role.USER)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalCount").value(1))
                .andReturn().getResponse().getContentAsString();
    }

    private String categories() throws Exception {
        return mockMvc.perform(get("/api/v1/categories").principal(actor(1L, Role.USER)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    private void flushAndClear() {
        entityManager.flush();
        entityManager.clear();
    }

    private static QuestionPrincipal actor(long userId, Role role) {
        return new TestPrincipal(userId, role, UserStatus.ACTIVE, null);
    }

    private static Stream<Arguments> editableQuestions() {
        return Stream.of(Role.values()).flatMap(role -> Stream.of(QuestionStatus.PENDING, QuestionStatus.REJECTED)
                .map(questionStatus -> Arguments.of(questionStatus, role)));
    }

    private static Stream<Arguments> deniedRequests() {
        return Stream.of(Arguments.of("OWN_APPROVED", Role.USER, 409, "QUESTION_NOT_EDITABLE"),
                Arguments.of("OTHER_APPROVED", Role.USER, 403, "ACCESS_DENIED"),
                Arguments.of("OTHER_PENDING", Role.USER, 404, "QUESTION_NOT_FOUND"),
                Arguments.of("OTHER_PENDING", Role.ADMIN, 404, "QUESTION_NOT_FOUND"),
                Arguments.of("OTHER_REJECTED", Role.USER, 404, "QUESTION_NOT_FOUND"),
                Arguments.of("OWN_HIDDEN", Role.USER, 404, "QUESTION_NOT_FOUND"),
                Arguments.of("ADMIN_SOURCE", Role.ADMIN, 403, "ACCESS_DENIED"));
    }

    private record TestPrincipal(Long userId, Role role, UserStatus status, Instant deletedAt) implements QuestionPrincipal {
    }
}
