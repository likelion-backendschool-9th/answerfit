package com.likelion.answerfit.question.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.likelion.answerfit.question.auth.QuestionPrincipal;
import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.ModerationType;
import com.likelion.answerfit.question.entity.Question;
import com.likelion.answerfit.question.entity.QuestionLike;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.entity.QuestionModeration;
import com.likelion.answerfit.question.entity.QuestionReport;
import com.likelion.answerfit.question.entity.QuestionStatus;
import com.likelion.answerfit.question.entity.ReportReasonType;
import com.likelion.answerfit.user.entity.Role;
import com.likelion.answerfit.user.entity.UserStatus;

import jakarta.persistence.EntityManager;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@Transactional
class QuestionDetailIntegrationTest {

    private static final String PATH = "/api/v1/learning/questions/{id}";
    private static final Instant TIME = Instant.parse("2026-11-26T00:00:00Z");
    private final QuestionPrincipal member = actor(1L);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Test
    void 공개_상세는_답안과_키워드와_개인화를_반환하고_최근접_공개_질문을_연결한다() throws Exception {
        Category os = category(QuestionMajor.CS, "운영체제");
        Question current = Question.createByUser(QuestionMajor.CS, os, "프로세스와 스레드의 차이는?", 2L);
        current.reject(99L);
        persist(current);
        moderation(current, ModerationType.REJECT, "지난 검토 사유");
        current.update(os, "프로세스와 스레드의 차이는?");
        current.approve(99L);
        current.completeModelAnswer("프로세스는 실행 단위입니다.\n\n스레드는 프로세스의 실행 흐름입니다.");
        current.addKeyword("프로세스");
        current.addKeyword("스레드");
        entityManager.persist(QuestionLike.create(1L, current));
        entityManager.persist(QuestionLike.create(2L, current));
        QuestionReport handled = QuestionReport.builder().question(current).reporterId(1L)
                .reasonType(ReportReasonType.ETC).reason("처리가 끝난 신고").build();
        handled.dismiss(99L);
        entityManager.persist(handled);

        Question older = admin(QuestionMajor.CS, os, "이전 시각의 질문입니다.");
        Question newer = admin(QuestionMajor.CS, os, "다음 시각의 질문입니다.");
        Question otherCategory = admin(QuestionMajor.CS, category(QuestionMajor.CS, "네트워크"), "다른 분류");
        Question hidden = admin(QuestionMajor.CS, os, "숨김 질문");
        hidden.hide();
        Question pending = persist(Question.createByUser(QuestionMajor.CS, os, "승인 대기 질문입니다.", 1L));
        timestamp(current, TIME);
        timestamp(older, TIME.minusSeconds(60));
        timestamp(newer, TIME.plusSeconds(60));
        timestamp(otherCategory, TIME.plusSeconds(1));
        timestamp(hidden, TIME.plusSeconds(2));
        timestamp(pending, TIME.minusSeconds(1));
        flushAndClear();

        mockMvc.perform(get(PATH, current.getId()).principal(member))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(current.getId().toString()))
                .andExpect(jsonPath("$.category.id").value(os.getId().toString()))
                .andExpect(jsonPath("$.source").value("USER"))
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.createdAt").value(TIME.toString()))
                .andExpect(jsonPath("$.reviewedAt").isString())
                .andExpect(jsonPath("$.modelAnswer").value(current.getModelAnswer()))
                .andExpect(jsonPath("$.modelAnswerStatus").value("DONE"))
                .andExpect(jsonPath("$.keywords", contains("프로세스", "스레드")))
                .andExpect(jsonPath("$.likeCount").value(2))
                .andExpect(jsonPath("$.isLiked").value(true))
                .andExpect(jsonPath("$.isMine").value(false))
                .andExpect(jsonPath("$.isReported").value(true))
                .andExpect(jsonPath("$.canEdit").value(false))
                .andExpect(jsonPath("$.canDelete").value(false))
                .andExpect(jsonPath("$.canReport").value(false))
                .andExpect(jsonPath("$.rejectionReason").value(nullValue()))
                .andExpect(jsonPath("$.previous.id").value(newer.getId().toString()))
                .andExpect(jsonPath("$.next.id").value(older.getId().toString()))
                .andExpect(jsonPath("$.authorId").doesNotExist())
                .andExpect(jsonPath("$.reviewedBy").doesNotExist());

        mockMvc.perform(get(PATH, current.getId()).principal(actor(2L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isMine").value(true))
                .andExpect(jsonPath("$.canEdit").value(false))
                .andExpect(jsonPath("$.canDelete").value(false))
                .andExpect(jsonPath("$.canReport").value(false));
        mockMvc.perform(get(PATH, current.getId()).principal(actor(3L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isLiked").value(false))
                .andExpect(jsonPath("$.isReported").value(false))
                .andExpect(jsonPath("$.canReport").value(true));
    }

    @Test
    void 본인_재제출_대기_상세는_수정_삭제가_가능하고_이전_반려_사유와_이웃은_없다() throws Exception {
        Category os = category(QuestionMajor.CS, "운영체제");
        Question question = persist(Question.createByUser(QuestionMajor.CS, os, "최초로 제출한 질문입니다.", 1L));
        question.reject(99L);
        moderation(question, ModerationType.REJECT, "수정 이전 반려 사유");
        question.update(os, "수정 후 재제출한 질문입니다.");
        admin(QuestionMajor.CS, os, "주변에 있는 공개 질문");
        flushAndClear();

        mockMvc.perform(get(PATH, question.getId()).principal(member))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.isMine").value(true))
                .andExpect(jsonPath("$.canEdit").value(true))
                .andExpect(jsonPath("$.canDelete").value(true))
                .andExpect(jsonPath("$.canReport").value(false))
                .andExpect(jsonPath("$.reviewedAt").value(nullValue()))
                .andExpect(jsonPath("$.modelAnswer").value(nullValue()))
                .andExpect(jsonPath("$.modelAnswerStatus").value(nullValue()))
                .andExpect(jsonPath("$.keywords").isEmpty())
                .andExpect(jsonPath("$.rejectionReason").value(nullValue()))
                .andExpect(jsonPath("$.previous").value(nullValue()))
                .andExpect(jsonPath("$.next").value(nullValue()));

        Question unchanged = entityManager.find(Question.class, question.getId());
        assertThat(unchanged.getStatus()).isEqualTo(QuestionStatus.PENDING);
        assertThat(unchanged.getModelAnswerStatus()).isNull();
        assertThat(entityManager.createQuery("select count(m) from QuestionModeration m where m.question.id = :id", Long.class)
                .setParameter("id", question.getId()).getSingleResult()).isEqualTo(1);
    }

    @Test
    void 반려_상세는_본인에게만_최신_REJECT_사유를_제공한다() throws Exception {
        Category os = category(QuestionMajor.CS, "운영체제");
        Question question = persist(Question.createByUser(QuestionMajor.CS, os, "반려할 질문의 첫 버전입니다.", 1L));
        question.reject(99L);
        QuestionModeration first = moderation(question, ModerationType.REJECT, "첫 반려 사유");
        question.update(os, "반려할 질문의 두 번째 버전입니다.");
        question.reject(99L);
        QuestionModeration last = moderation(question, ModerationType.REJECT, "현재 반려 사유");
        QuestionModeration report = moderation(question, ModerationType.REPORT, "노출하면 안 되는 신고 조치 사유");
        moderationTime(first, TIME);
        moderationTime(last, TIME.plusSeconds(1));
        moderationTime(report, TIME.plusSeconds(2));
        flushAndClear();

        mockMvc.perform(get(PATH, question.getId()).principal(member))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.rejectionReason").value("현재 반려 사유"))
                .andExpect(jsonPath("$.canEdit").value(true))
                .andExpect(jsonPath("$.canDelete").value(true))
                .andExpect(jsonPath("$.previous").value(nullValue()))
                .andExpect(jsonPath("$.next").value(nullValue()));
        for (QuestionPrincipal other : new QuestionPrincipal[] {
                actor(2L), new TestPrincipal(99L, Role.ADMIN, UserStatus.ACTIVE, null)}) {
            mockMvc.perform(get(PATH, question.getId()).principal(other))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("QUESTION_NOT_FOUND"))
                    .andExpect(content().string(not(containsString("현재 반려 사유"))));
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"OTHER_PENDING", "OTHER_REJECTED", "OWN_HIDDEN", "OWN_DELETED", "PUBLIC_DELETED", "MISSING"})
    void 비공개_또는_없는_질문은_동일한_404로_존재_여부와_내용을_숨긴다(String scenario) throws Exception {
        Long id = Long.MAX_VALUE;
        if (!scenario.equals("MISSING")) {
            boolean mine = scenario.startsWith("OWN");
            Question question = persist(Question.createByUser(QuestionMajor.CS,
                    category(QuestionMajor.CS, "운영체제"), "노출하면 안 되는 민감 원문", mine ? 1L : 2L));
            switch (scenario) {
                case "OTHER_REJECTED" -> question.reject(99L);
                case "OWN_HIDDEN" -> {
                    question.approve(99L);
                    question.hide();
                }
                case "OWN_DELETED" -> question.delete();
                case "PUBLIC_DELETED" -> {
                    question.approve(99L);
                    question.deleteByAdmin();
                }
                default -> { }
            }
            id = question.getId();
        }
        flushAndClear();

        mockMvc.perform(get(PATH, id).principal(member))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("QUESTION_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("질문을 찾을 수 없습니다."))
                .andExpect(jsonPath("$.modelAnswer").doesNotExist())
                .andExpect(jsonPath("$.rejectionReason").doesNotExist())
                .andExpect(content().string(not(containsString("민감 원문"))));
    }

    @Test
    void 중분류_없는_인성_이웃은_같은_시각의_ID와_같은_null_분류로_구분한다() throws Exception {
        Question older = admin(QuestionMajor.PERSONALITY, null, "오래된 인성 질문");
        Question current = admin(QuestionMajor.PERSONALITY, null, "현재 인성 질문");
        Question newer = admin(QuestionMajor.PERSONALITY, null, "새로운 인성 질문");
        admin(QuestionMajor.PERSONALITY, category(QuestionMajor.PERSONALITY, "협업"), "분류가 있는 질문");
        Question hidden = admin(QuestionMajor.PERSONALITY, null, "숨김 인성 질문");
        hidden.hide();
        entityManager.flush();
        entityManager.createQuery("update Question question set question.createdAt = :time")
                .setParameter("time", TIME).executeUpdate();
        entityManager.clear();

        mockMvc.perform(get(PATH, current.getId()).principal(member))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.category").value(nullValue()))
                .andExpect(jsonPath("$.previous.id").value(newer.getId().toString()))
                .andExpect(jsonPath("$.next.id").value(older.getId().toString()));
        mockMvc.perform(get(PATH, newer.getId()).principal(member))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.previous").value(nullValue()))
                .andExpect(jsonPath("$.next.id").value(current.getId().toString()));
        mockMvc.perform(get(PATH, older.getId()).principal(member))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.previous.id").value(current.getId().toString()))
                .andExpect(jsonPath("$.next").value(nullValue()));
    }

    private Question admin(QuestionMajor major, Category category, String text) {
        return persist(Question.createByAdmin(major, category, text, null, null, 99L));
    }

    private Question persist(Question question) {
        entityManager.persist(question);
        return question;
    }

    private QuestionModeration moderation(Question question, ModerationType type, String reason) {
        QuestionModeration moderation = QuestionModeration.builder().question(question)
                .moderationType(type).reason(reason).moderatorId(99L).build();
        entityManager.persist(moderation);
        return moderation;
    }

    private Category category(QuestionMajor major, String name) {
        return entityManager.createQuery("select c from Category c where c.major = :major and c.name = :name", Category.class)
                .setParameter("major", major).setParameter("name", name).getSingleResult();
    }

    private void timestamp(Question question, Instant time) {
        entityManager.flush();
        entityManager.createQuery("update Question q set q.createdAt = :time where q.id = :id")
                .setParameter("time", time).setParameter("id", question.getId()).executeUpdate();
    }

    private void moderationTime(QuestionModeration moderation, Instant time) {
        entityManager.flush();
        entityManager.createQuery("update QuestionModeration m set m.createdAt = :time where m.id = :id")
                .setParameter("time", time).setParameter("id", moderation.getId()).executeUpdate();
    }

    private void flushAndClear() {
        entityManager.flush();
        entityManager.clear();
    }

    private static QuestionPrincipal actor(Long id) {
        return new TestPrincipal(id, Role.USER, UserStatus.ACTIVE, null);
    }

    private record TestPrincipal(Long userId, Role role, UserStatus status, Instant deletedAt)
            implements QuestionPrincipal {
    }
}
