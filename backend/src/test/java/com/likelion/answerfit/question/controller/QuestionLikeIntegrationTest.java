package com.likelion.answerfit.question.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.likelion.answerfit.question.auth.QuestionPrincipal;
import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.Question;
import com.likelion.answerfit.question.entity.QuestionLike;
import com.likelion.answerfit.question.entity.QuestionLikeId;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.repository.QuestionLikeRepository;
import com.likelion.answerfit.user.entity.Role;
import com.likelion.answerfit.user.entity.UserStatus;

import jakarta.persistence.EntityManager;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class QuestionLikeIntegrationTest {

    private static final String PATH = "/api/v1/learning/questions/{id}/likes";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private QuestionLikeRepository questionLikeRepository;

    @Test
    void 본인의_승인_질문도_좋아요할_수_있고_반복_POST는_기존_행과_생성시각을_유지한다() throws Exception {
        Question question = userQuestion(1L);
        question.approve(99L);
        entityManager.persist(QuestionLike.create(2L, question));
        flushAndClear();

        like(question.getId(), actor(1L, Role.USER))
                .andExpect(status().isOk()).andExpect(jsonPath("$.likeCount").value(2))
                .andExpect(jsonPath("$.isLiked").value(true));
        flushAndClear();
        Instant createdAt = questionLikeRepository.findById(new QuestionLikeId(1L, question.getId()))
                .orElseThrow().getCreatedAt();
        entityManager.clear();

        like(question.getId(), actor(1L, Role.USER))
                .andExpect(status().isOk()).andExpect(jsonPath("$.likeCount").value(2))
                .andExpect(jsonPath("$.isLiked").value(true));
        flushAndClear();

        assertThat(questionLikeRepository.countByIdQuestionId(question.getId())).isEqualTo(2);
        assertThat(questionLikeRepository.findById(new QuestionLikeId(1L, question.getId()))
                .orElseThrow().getCreatedAt()).isEqualTo(createdAt);
        assertThat(questionLikeRepository.existsById(new QuestionLikeId(2L, question.getId()))).isTrue();
    }

    @Test
    void 반복_DELETE는_본인의_해당_질문_좋아요만_취소한다() throws Exception {
        Question question = adminQuestion(QuestionMajor.CS);
        Question otherQuestion = adminQuestion(QuestionMajor.CS);
        entityManager.persist(QuestionLike.create(1L, question));
        entityManager.persist(QuestionLike.create(2L, question));
        entityManager.persist(QuestionLike.create(1L, otherQuestion));
        flushAndClear();

        for (int attempt = 0; attempt < 2; attempt++) {
            unlike(question.getId(), actor(1L, Role.USER))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.likeCount").value(1))
                    .andExpect(jsonPath("$.isLiked").value(false));
            flushAndClear();
        }

        assertThat(questionLikeRepository.existsById(new QuestionLikeId(1L, question.getId()))).isFalse();
        assertThat(questionLikeRepository.existsById(new QuestionLikeId(2L, question.getId()))).isTrue();
        assertThat(questionLikeRepository.existsById(new QuestionLikeId(1L, otherQuestion.getId()))).isTrue();
    }

    @Test
    void 인성_관리자_질문도_등록과_취소가_가능하고_관리자_역할의_인증_ID를_사용한다() throws Exception {
        Question question = adminQuestion(QuestionMajor.PERSONALITY);
        flushAndClear();

        like(question.getId(), actor(7L, Role.ADMIN))
                .andExpect(status().isOk()).andExpect(jsonPath("$.likeCount").value(1))
                .andExpect(jsonPath("$.isLiked").value(true));
        flushAndClear();
        assertThat(questionLikeRepository.existsById(new QuestionLikeId(7L, question.getId()))).isTrue();
        assertThat(questionLikeRepository.existsById(new QuestionLikeId(999L, question.getId()))).isFalse();
        entityManager.clear();

        unlike(question.getId(), actor(7L, Role.ADMIN))
                .andExpect(status().isOk()).andExpect(jsonPath("$.likeCount").value(0))
                .andExpect(jsonPath("$.isLiked").value(false));
        flushAndClear();
        assertThat(questionLikeRepository.countByIdQuestionId(question.getId())).isZero();
    }

    @Test
    void 좋아요_변경은_상세_개인화와_목록_필터_정렬에_반영된다() throws Exception {
        Question target = adminQuestion(QuestionMajor.CS);
        Question newer = adminQuestion(QuestionMajor.CS);
        flushAndClear();
        // 같은 등록 시각의 정렬에서도 ID로 순서가 결정되도록 한다.
        entityManager.createNativeQuery("update questions set created_at = :time where id in (:first, :second)")
                .setParameter("time", Instant.parse("2026-11-26T00:00:00Z"))
                .setParameter("first", target.getId()).setParameter("second", newer.getId()).executeUpdate();
        entityManager.clear();

        like(target.getId(), actor(1L, Role.USER)).andExpect(status().isOk());
        flushAndClear();
        detail(target.getId(), 1L).andExpect(jsonPath("$.likeCount").value(1))
                .andExpect(jsonPath("$.isLiked").value(true));
        detail(target.getId(), 2L).andExpect(jsonPath("$.likeCount").value(1))
                .andExpect(jsonPath("$.isLiked").value(false));
        likedList(1L).andExpect(jsonPath("$.totalCount").value(1))
                .andExpect(jsonPath("$.items[0].id").value(target.getId().toString()))
                .andExpect(jsonPath("$.items[0].isLiked").value(true));
        likedList(2L).andExpect(jsonPath("$.totalCount").value(0));
        sortedList().andExpect(jsonPath("$.items[0].id").value(target.getId().toString()));
        entityManager.clear();

        unlike(target.getId(), actor(1L, Role.USER)).andExpect(status().isOk());
        flushAndClear();
        detail(target.getId(), 1L).andExpect(jsonPath("$.likeCount").value(0))
                .andExpect(jsonPath("$.isLiked").value(false));
        likedList(1L).andExpect(jsonPath("$.totalCount").value(0));
        sortedList().andExpect(jsonPath("$.items[0].id").value(newer.getId().toString()));
    }

    @ParameterizedTest(name = "{0}: {1}")
    @MethodSource("inaccessibleQuestions")
    void 본인과_관리자도_미공개_질문의_좋아요를_변경하지_못한다(
            String state, Role role, boolean adding) throws Exception {
        Question question = null;
        if (!state.equals("MISSING")) {
            question = userQuestion(state.equals("OTHER_PENDING") ? 2L : 1L);
            if (state.equals("REJECTED")) question.reject(99L);
            if (state.equals("HIDDEN") || state.equals("DELETED")) {
                question.approve(99L);
                entityManager.persist(QuestionLike.create(1L, question));
                entityManager.persist(QuestionLike.create(2L, question));
                if (state.equals("HIDDEN")) question.hide();
                else question.deleteByAdmin();
            }
        }
        Long id = question == null ? Long.MAX_VALUE : question.getId();
        flushAndClear();
        long before = questionLikeRepository.countByIdQuestionId(id);

        (adding ? like(id, actor(1L, role)) : unlike(id, actor(1L, role)))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("QUESTION_NOT_FOUND"));
        entityManager.clear();

        assertThat(questionLikeRepository.countByIdQuestionId(id)).isEqualTo(before);
    }

    private ResultActions like(Long id, QuestionPrincipal principal) throws Exception {
        return mockMvc.perform(post(PATH, id).principal(principal)
                .header("X-User-Id", "999").queryParam("userId", "999"));
    }

    private ResultActions unlike(Long id, QuestionPrincipal principal) throws Exception {
        return mockMvc.perform(delete(PATH, id).principal(principal)
                .header("X-User-Id", "999").queryParam("userId", "999"));
    }

    private ResultActions detail(Long id, long userId) throws Exception {
        return mockMvc.perform(get("/api/v1/learning/questions/{id}", id).principal(actor(userId, Role.USER)))
                .andExpect(status().isOk());
    }

    private ResultActions likedList(long userId) throws Exception {
        return mockMvc.perform(get("/api/v1/learning/questions").param("likedOnly", "true")
                        .principal(actor(userId, Role.USER))).andExpect(status().isOk());
    }

    private ResultActions sortedList() throws Exception {
        return mockMvc.perform(get("/api/v1/learning/questions").param("sort", "LIKES")
                        .principal(actor(1L, Role.USER))).andExpect(status().isOk());
    }

    private Question userQuestion(long userId) {
        Question question = Question.createByUser(QuestionMajor.CS, category(), "프로세스와 스레드의 차이는 무엇인가요?", userId);
        entityManager.persist(question);
        return question;
    }

    private Question adminQuestion(QuestionMajor major) {
        Question question = Question.createByAdmin(major, major == QuestionMajor.CS ? category() : null,
                "관리자가 등록한 공개 질문입니다.", "모범 답안", null, 99L);
        entityManager.persist(question);
        return question;
    }

    private Category category() {
        return entityManager.createQuery("select c from Category c where c.major = :major and c.name = :name", Category.class)
                .setParameter("major", QuestionMajor.CS).setParameter("name", "운영체제").getSingleResult();
    }

    private void flushAndClear() {
        entityManager.flush();
        entityManager.clear();
    }

    private static QuestionPrincipal actor(long userId, Role role) {
        return new TestPrincipal(userId, role, UserStatus.ACTIVE, null);
    }

    private static Stream<Arguments> inaccessibleQuestions() {
        return Stream.of("PENDING", "OTHER_PENDING", "REJECTED", "HIDDEN", "DELETED", "MISSING")
                .flatMap(state -> Stream.of(Role.values()).flatMap(role -> Stream.of(true, false)
                        .map(adding -> Arguments.of(state, role, adding))));
    }

    private record TestPrincipal(Long userId, Role role, UserStatus status, Instant deletedAt) implements QuestionPrincipal {
    }
}
