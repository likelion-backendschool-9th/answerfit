package com.likelion.answerfit.question.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
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
import com.likelion.answerfit.question.entity.QuestionSource;
import com.likelion.answerfit.question.entity.QuestionStatus;
import com.likelion.answerfit.question.repository.QuestionRepository;
import com.likelion.answerfit.user.entity.Role;
import com.likelion.answerfit.user.entity.UserStatus;

import jakarta.persistence.EntityManager;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class QuestionUpdateIntegrationTest {

    private static final String PATH = "/api/v1/learning/questions/{id}";
    private static final String OLD_CONTENT = "수정 전의 프로세스 질문입니다.";
    private static final String NEW_CONTENT = "수정 후의 프로세스 질문입니다.";
    private final QuestionPrincipal member = actor(1L, Role.USER);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private QuestionRepository questionRepository;

    @ParameterizedTest
    @ValueSource(strings = {"CONTENT", "CATEGORY", "BOTH"})
    void 본인_대기_질문은_제공한_필드만_바꾸고_ID와_소유권을_유지한다(String change) throws Exception {
        Category os = category(QuestionMajor.CS, "운영체제");
        Category network = category(QuestionMajor.CS, "네트워크");
        Question question = userQuestion(1L, os);
        flushAndClear();
        long before = questionRepository.count();
        Map<String, Object> body = new HashMap<>();
        if (!change.equals("CATEGORY")) body.put("content", "\uFEFF  " + NEW_CONTENT + " \u00A0");
        if (!change.equals("CONTENT")) body.put("categoryId", network.getId().toString());

        submit(question.getId(), body, member)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(question.getId().toString()))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.canEdit").value(true))
                .andExpect(jsonPath("$.canDelete").value(true));
        flushAndClear();

        Question saved = questionRepository.findById(question.getId()).orElseThrow();
        assertThat(saved.getContent()).isEqualTo(change.equals("CATEGORY") ? OLD_CONTENT : NEW_CONTENT);
        assertThat(saved.getCategory().getId()).isEqualTo(change.equals("CONTENT") ? os.getId() : network.getId());
        assertThat(saved.getAuthorId()).isEqualTo(1L);
        assertThat(saved.getSource()).isEqualTo(QuestionSource.USER);
        assertThat(saved.getMajor()).isEqualTo(QuestionMajor.CS);
        assertThat(questionRepository.count()).isEqualTo(before);
    }

    @ParameterizedTest
    @ValueSource(strings = {"CONTENT", "CATEGORY", "SAME_CATEGORY"})
    void 반려된_질문은_같은_ID로_재제출하고_검토_정보만_초기화한다(String change) throws Exception {
        Category os = category(QuestionMajor.CS, "운영체제");
        Question question = userQuestion(1L, os);
        question.reject(99L);
        QuestionModeration history = rejection(question);
        flushAndClear();
        Instant createdAt = entityManager.createQuery("select q.createdAt from Question q where q.id = :id", Instant.class)
                .setParameter("id", question.getId()).getSingleResult();
        Map<String, Object> body = change.equals("CONTENT") ? Map.of("content", NEW_CONTENT)
                : Map.of("categoryId", change.equals("SAME_CATEGORY") ? os.getId()
                        : category(QuestionMajor.CS, "네트워크").getId());

        submit(question.getId(), body, member)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(question.getId().toString()))
                .andExpect(jsonPath("$.status").value("PENDING"));
        flushAndClear();

        Question saved = questionRepository.findById(question.getId()).orElseThrow();
        assertThat(saved.getStatus()).isEqualTo(QuestionStatus.PENDING);
        assertThat(saved.getCreatedAt()).isEqualTo(createdAt);
        assertThat(saved.getReviewedBy()).isNull();
        assertThat(saved.getReviewedAt()).isNull();
        assertThat(saved.getModelAnswer()).isNull();
        assertThat(saved.getModelAnswerStatus()).isNull();
        assertThat(saved.getAuthorId()).isEqualTo(1L);
        assertThat(entityManager.find(QuestionModeration.class, history.getId()).getReason()).isEqualTo("기존 반려 사유");

        mockMvc.perform(get(PATH, question.getId()).principal(member))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rejectionReason").value(nullValue()))
                .andExpect(jsonPath("$.reviewedAt").value(nullValue()))
                .andExpect(jsonPath("$.previous").value(nullValue()))
                .andExpect(jsonPath("$.next").value(nullValue()));
        mockMvc.perform(get(PATH, question.getId()).principal(actor(2L, Role.USER)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/learning/questions").principal(member))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalCount").value(0));
    }

    @Test
    void 명시적인_null은_미제공으로_취급하고_추가_JSON_속성은_소유권과_상태를_바꾸지_못한다() throws Exception {
        Question question = userQuestion(1L, category(QuestionMajor.CS, "운영체제"));
        flushAndClear();
        Map<String, Object> body = new HashMap<>();
        body.put("categoryId", null);
        body.put("content", NEW_CONTENT);
        body.put("authorId", 999L);
        body.put("source", "ADMIN");
        body.put("status", "APPROVED");
        body.put("major", "PERSONALITY");
        body.put("modelAnswer", "사용자가 전달한 가짜 답안");
        body.put("modelAnswerStatus", "DONE");
        submit(question.getId(), body, member).andExpect(status().isOk());
        flushAndClear();

        Question saved = questionRepository.findById(question.getId()).orElseThrow();
        assertThat(saved.getContent()).isEqualTo(NEW_CONTENT);
        assertThat(saved.getAuthorId()).isEqualTo(1L);
        assertThat(saved.getSource()).isEqualTo(QuestionSource.USER);
        assertThat(saved.getMajor()).isEqualTo(QuestionMajor.CS);
        assertThat(saved.getStatus()).isEqualTo(QuestionStatus.PENDING);
        assertThat(saved.getModelAnswer()).isNull();
        assertThat(saved.getModelAnswerStatus()).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"MISSING", "PERSONALITY"})
    void 잘못된_분류로_재제출하면_본문과_반려_상태를_바꾸지_않는다(String invalid) throws Exception {
        Question question = userQuestion(1L, category(QuestionMajor.CS, "운영체제"));
        question.reject(99L);
        rejection(question);
        flushAndClear();
        Long categoryId = invalid.equals("MISSING") ? Long.MAX_VALUE
                : category(QuestionMajor.PERSONALITY, "협업").getId();

        submit(question.getId(), Map.of("categoryId", categoryId, "content", NEW_CONTENT), member)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CATEGORY"));
        entityManager.clear();
        Question saved = questionRepository.findById(question.getId()).orElseThrow();
        assertThat(saved.getContent()).isEqualTo(OLD_CONTENT);
        assertThat(saved.getStatus()).isEqualTo(QuestionStatus.REJECTED);
        assertThat(saved.getReviewedBy()).isEqualTo(99L);
        assertThat(saved.getReviewedAt()).isNotNull();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("deniedRequests")
    void 수정_권한이_없으면_분류_오류보다_먼저_거절하고_원문을_유지한다(
            String scenario, int expectedStatus, String expectedCode, Role role) throws Exception {
        Question question = null;
        if (!scenario.equals("MISSING")) {
            if (scenario.equals("ADMIN_SOURCE")) {
                question = Question.createByAdmin(QuestionMajor.CS, category(QuestionMajor.CS, "운영체제"),
                        OLD_CONTENT, "관리자 답안", null, 1L);
                entityManager.persist(question);
            } else {
                boolean mine = scenario.startsWith("OWN");
                question = userQuestion(mine ? 1L : 2L, category(QuestionMajor.CS, "운영체제"));
                if (scenario.endsWith("APPROVED") || scenario.endsWith("HIDDEN")) question.approve(99L);
                if (scenario.endsWith("REJECTED")) question.reject(99L);
                if (scenario.endsWith("HIDDEN")) question.hide();
                if (scenario.endsWith("DELETED")) question.delete();
            }
        }
        Long id = question == null ? Long.MAX_VALUE : question.getId();
        QuestionStatus oldStatus = question == null ? null : question.getStatus();
        flushAndClear();

        submit(id, Map.of("content", NEW_CONTENT, "categoryId", Long.MAX_VALUE), actor(1L, role))
                .andExpect(status().is(expectedStatus))
                .andExpect(jsonPath("$.code").value(expectedCode))
                .andExpect(content().string(not(containsString(OLD_CONTENT))));
        entityManager.clear();
        if (question != null) {
            Object[] row = (Object[]) entityManager.createNativeQuery("select content, status from questions where id = :id")
                    .setParameter("id", id).getSingleResult();
            assertThat(row).containsExactly(OLD_CONTENT, oldStatus.name());
        }
    }

    @Test
    void 빈_PATCH로_반려_상태를_재제출하지_못한다() throws Exception {
        Question question = userQuestion(1L, category(QuestionMajor.CS, "운영체제"));
        question.reject(99L);
        flushAndClear();

        submit(question.getId(), Map.of("changeRequested", true, "status", "PENDING"), member)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        entityManager.clear();
        Question saved = questionRepository.findById(question.getId()).orElseThrow();
        assertThat(saved.getStatus()).isEqualTo(QuestionStatus.REJECTED);
        assertThat(saved.getReviewedBy()).isEqualTo(99L);
    }

    private ResultActions submit(Long id, Map<String, Object> body, QuestionPrincipal principal) throws Exception {
        return mockMvc.perform(patch(PATH, id).principal(principal).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private Question userQuestion(long authorId, Category category) {
        Question question = Question.createByUser(QuestionMajor.CS, category, OLD_CONTENT, authorId);
        entityManager.persist(question);
        return question;
    }

    private QuestionModeration rejection(Question question) {
        QuestionModeration moderation = QuestionModeration.builder().question(question).moderationType(ModerationType.REJECT)
                .moderatorId(99L).reason("기존 반려 사유").build();
        entityManager.persist(moderation);
        return moderation;
    }

    private Category category(QuestionMajor major, String name) {
        return entityManager.createQuery("select c from Category c where c.major = :major and c.name = :name", Category.class)
                .setParameter("major", major).setParameter("name", name).getSingleResult();
    }

    private void flushAndClear() {
        entityManager.flush();
        entityManager.clear();
    }

    private static QuestionPrincipal actor(Long id, Role role) {
        return new TestPrincipal(id, role, UserStatus.ACTIVE, null);
    }

    private static Stream<Arguments> deniedRequests() {
        return Stream.of(Arguments.of("OWN_APPROVED", 409, "QUESTION_NOT_EDITABLE", Role.USER),
                Arguments.of("OTHER_APPROVED", 403, "ACCESS_DENIED", Role.USER),
                Arguments.of("ADMIN_SOURCE", 403, "ACCESS_DENIED", Role.ADMIN),
                Arguments.of("OTHER_PENDING", 404, "QUESTION_NOT_FOUND", Role.USER),
                Arguments.of("OTHER_PENDING", 404, "QUESTION_NOT_FOUND", Role.ADMIN),
                Arguments.of("OTHER_REJECTED", 404, "QUESTION_NOT_FOUND", Role.USER),
                Arguments.of("OWN_HIDDEN", 404, "QUESTION_NOT_FOUND", Role.USER),
                Arguments.of("OWN_DELETED", 404, "QUESTION_NOT_FOUND", Role.USER),
                Arguments.of("MISSING", 404, "QUESTION_NOT_FOUND", Role.USER));
    }

    private record TestPrincipal(Long userId, Role role, UserStatus status, Instant deletedAt)
            implements QuestionPrincipal {
    }
}
