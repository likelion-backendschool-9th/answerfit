package com.likelion.answerfit.question.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.likelion.answerfit.question.auth.QuestionPrincipal;
import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.Question;
import com.likelion.answerfit.question.entity.QuestionMajor;
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
class QuestionCreateIntegrationTest {

    private static final String PATH = "/api/v1/learning/questions";
    private static final String CONTENT = "프로세스와 스레드의 차이를 설명해 주세요.";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private QuestionRepository questionRepository;

    @ParameterizedTest
    @EnumSource(Role.class)
    void 등록은_USER_승인대기로_저장하고_생성_ID로_본인만_상세를_열_수_있다(Role role) throws Exception {
        Category os = category(QuestionMajor.CS, "운영체제");
        QuestionPrincipal author = actor(1L, role);
        long id = createdId(submit(payload(os.getId(), "\uFEFF \u00A0" + CONTENT + " \n"), author));
        entityManager.flush();
        entityManager.clear();

        Question saved = questionRepository.findById(id).orElseThrow();
        assertThat(saved.getMajor()).isEqualTo(QuestionMajor.CS);
        assertThat(saved.getCategory().getId()).isEqualTo(os.getId());
        assertThat(saved.getSource()).isEqualTo(QuestionSource.USER);
        assertThat(saved.getAuthorId()).isEqualTo(1L);
        assertThat(saved.getStatus()).isEqualTo(QuestionStatus.PENDING);
        assertThat(saved.getContent()).isEqualTo(CONTENT);
        assertThat(saved.getReviewedBy()).isNull();
        assertThat(saved.getReviewedAt()).isNull();
        assertThat(saved.getModelAnswer()).isNull();
        assertThat(saved.getModelAnswerStatus()).isNull();
        assertThat(saved.getKeywords()).isEmpty();
        assertThat(saved.getCreatedAt()).isNotNull();

        mockMvc.perform(get(PATH + "/{id}", id).principal(author))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(Long.toString(id)))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.isMine").value(true))
                .andExpect(jsonPath("$.canEdit").value(true))
                .andExpect(jsonPath("$.canDelete").value(true))
                .andExpect(jsonPath("$.modelAnswer").value(nullValue()))
                .andExpect(jsonPath("$.modelAnswerStatus").value(nullValue()))
                .andExpect(jsonPath("$.keywords").isEmpty());
        mockMvc.perform(get(PATH + "/{id}", id).principal(actor(2L, Role.USER)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("QUESTION_NOT_FOUND"));
        mockMvc.perform(get(PATH).principal(author))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCount").value(0))
                .andExpect(jsonPath("$.items").isEmpty())
                .andExpect(jsonPath("$.majorCounts.CS").value(0));
        mockMvc.perform(get("/api/v1/categories").principal(author))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.majors[0].questionCount").value(0))
                .andExpect(jsonPath("$.majors[0].categories[0].questionCount").value(0));
    }

    @Test
    void JSON의_작성자_출처_상태_답안_추가값으로_서버_초기값을_바꿀_수_없다() throws Exception {
        Map<String, Object> body = payload(category(QuestionMajor.CS, "운영체제").getId(), CONTENT);
        body.put("authorId", 999L);
        body.put("source", "ADMIN");
        body.put("major", "PERSONALITY");
        body.put("status", "APPROVED");
        body.put("reviewedBy", 999L);
        body.put("modelAnswer", "승인된 답안처럼 위장한 값");
        body.put("modelAnswerStatus", "DONE");
        long id = createdId(submit(body, actor(1L, Role.USER)));
        entityManager.flush();
        entityManager.clear();

        Question saved = questionRepository.findById(id).orElseThrow();
        assertThat(saved.getAuthorId()).isEqualTo(1L);
        assertThat(saved.getSource()).isEqualTo(QuestionSource.USER);
        assertThat(saved.getMajor()).isEqualTo(QuestionMajor.CS);
        assertThat(saved.getStatus()).isEqualTo(QuestionStatus.PENDING);
        assertThat(saved.getReviewedBy()).isNull();
        assertThat(saved.getModelAnswer()).isNull();
        assertThat(saved.getModelAnswerStatus()).isNull();
    }

    @Test
    void 없는_카테고리와_인성_카테고리는_저장하지_않는다() throws Exception {
        long before = questionRepository.count();
        Long personalityId = category(QuestionMajor.PERSONALITY, "협업").getId();
        for (Long id : new Long[] {Long.MAX_VALUE, personalityId}) {
            submit(payload(id, CONTENT), actor(1L, Role.USER))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("INVALID_CATEGORY"));
        }
        assertThat(questionRepository.count()).isEqualTo(before);
    }

    @ParameterizedTest
    @ValueSource(ints = {10, 200})
    void 이모지는_코드포인트_길이로_검증하고_정리한_원문을_저장한다(int length) throws Exception {
        String text = "😀".repeat(length);
        Long categoryId = category(QuestionMajor.CS, "운영체제").getId();
        long id = createdId(submit(payload(categoryId, "\u00A0 " + text + " \uFEFF"), actor(1L, Role.USER)));
        entityManager.flush();
        entityManager.clear();

        assertThat(questionRepository.findById(id).orElseThrow().getContent()).isEqualTo(text);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidContents")
    void 유효하지_않은_본문은_DB에_저장하지_않는다(String scenario, String content) throws Exception {
        long before = questionRepository.count();
        submit(payload(category(QuestionMajor.CS, "운영체제").getId(), content), actor(1L, Role.USER))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        assertThat(questionRepository.count()).isEqualTo(before);
    }

    @Test
    void 미인증_요청은_회원_ID_헤더가_있어도_질문을_만들지_못한다() throws Exception {
        long before = questionRepository.count();
        mockMvc.perform(post(PATH).contentType(MediaType.APPLICATION_JSON).header("X-User-Id", "1")
                        .content(objectMapper.writeValueAsString(payload(category(QuestionMajor.CS, "운영체제").getId(), CONTENT))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
        assertThat(questionRepository.count()).isEqualTo(before);
    }

    @Test
    void 같은_내용의_POST를_반복하면_각각_새로운_승인대기_질문을_만든다() throws Exception {
        long before = questionRepository.count();
        Map<String, Object> body = payload(category(QuestionMajor.CS, "운영체제").getId(), CONTENT);
        long first = createdId(submit(body, actor(1L, Role.USER)));
        long second = createdId(submit(body, actor(1L, Role.USER)));

        assertThat(second).isNotEqualTo(first);
        assertThat(questionRepository.count()).isEqualTo(before + 2);
    }

    private ResultActions submit(Map<String, Object> body, QuestionPrincipal principal) throws Exception {
        return mockMvc.perform(post(PATH).principal(principal).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private long createdId(ResultActions actions) throws Exception {
        MvcResult result = actions.andExpect(status().isCreated())
                .andExpect(header().string("Location", matchesPattern(PATH + "/[1-9][0-9]*")))
                .andExpect(jsonPath("$.id").isString())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn();
        String location = result.getResponse().getHeader("Location");
        long id = Long.parseLong(location.substring((PATH + "/").length()));
        actions.andExpect(jsonPath("$.id").value(Long.toString(id)));
        return id;
    }

    private Map<String, Object> payload(Long categoryId, String content) {
        Map<String, Object> body = new HashMap<>();
        body.put("categoryId", categoryId);
        body.put("content", content);
        return body;
    }

    private Category category(QuestionMajor major, String name) {
        return entityManager.createQuery("select c from Category c where c.major = :major and c.name = :name", Category.class)
                .setParameter("major", major).setParameter("name", name).getSingleResult();
    }

    private static Stream<Arguments> invalidContents() {
        return Stream.of(Arguments.of("null", null), Arguments.of("공백", "\uFEFF\u00A0 \t\n"),
                Arguments.of("9자", "가".repeat(9)), Arguments.of("201 코드포인트", "😀".repeat(201)));
    }

    private static QuestionPrincipal actor(Long id, Role role) {
        return new TestPrincipal(id, role, UserStatus.ACTIVE, null);
    }

    private record TestPrincipal(Long userId, Role role, UserStatus status, Instant deletedAt)
            implements QuestionPrincipal {
    }
}
