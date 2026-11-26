package com.likelion.answerfit.question.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;

import org.hibernate.SessionFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.likelion.answerfit.question.auth.QuestionMember;
import com.likelion.answerfit.question.auth.QuestionPrincipal;
import com.likelion.answerfit.question.dto.request.QuestionSearchRequest;
import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.Question;
import com.likelion.answerfit.question.entity.QuestionLike;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.entity.QuestionReport;
import com.likelion.answerfit.question.entity.ReportReasonType;
import com.likelion.answerfit.question.service.QuestionQueryService;
import com.likelion.answerfit.user.entity.Role;
import com.likelion.answerfit.user.entity.UserStatus;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;

@SpringBootTest(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
@AutoConfigureMockMvc
@Transactional
class QuestionListIntegrationTest {

    private static final String PATH = "/api/v1/learning/questions";
    private final QuestionPrincipal member = new TestPrincipal(1L, Role.USER, UserStatus.ACTIVE, null);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    @Autowired
    private QuestionQueryService questionQueryService;

    @Test
    void 공개_질문만_반환하고_좋아요와_신고와_소유권을_회원별로_구분한다() throws Exception {
        Category os = category(QuestionMajor.CS, "운영체제");
        Question mine = approvedUser(os, "본인 등록 프로세스 질문입니다.", 1L);
        Question other = approvedUser(os, "다른 회원의 스레드 질문입니다.", 2L);
        other.failModelAnswer();
        Question admin = adminQuestion(QuestionMajor.CS, os, "관리자 등록 메모리 질문입니다.");
        like(1L, mine);
        like(2L, mine);
        like(1L, other);
        like(2L, other);
        like(3L, other);
        QuestionReport handled = report(1L, other);
        handled.dismiss(99L);
        report(3L, other);
        report(3L, admin);

        persist(Question.createByUser(QuestionMajor.CS, os, "본인의 승인 대기 질문입니다.", 1L));
        Question rejected = persist(Question.createByUser(QuestionMajor.CS, os, "본인의 반려 질문입니다.", 1L));
        rejected.reject(99L);
        Question hidden = adminQuestion(QuestionMajor.CS, os, "숨긴 질문은 목록에서 제외합니다.");
        hidden.hide();
        Question deleted = adminQuestion(QuestionMajor.CS, os, "삭제 질문은 목록에서 제외합니다.");
        deleted.deleteByAdmin();
        adminQuestion(QuestionMajor.PERSONALITY, null, "인성 질문도 전체 건수에 포함합니다.");
        flushAndClear();

        mockMvc.perform(get(PATH).principal(member).param("sort", "LIKES").param("pageSize", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCount").value(3))
                .andExpect(jsonPath("$.items", hasSize(3)))
                .andExpect(jsonPath("$.items[0].id").isString())
                .andExpect(jsonPath("$.items[0].id").value(other.getId().toString()))
                .andExpect(jsonPath("$.items[0].likeCount").value(3))
                .andExpect(jsonPath("$.items[0].isLiked").value(true))
                .andExpect(jsonPath("$.items[0].isMine").value(false))
                .andExpect(jsonPath("$.items[0].isReported").value(true))
                .andExpect(jsonPath("$.items[0].category.id").value(os.getId().toString()))
                .andExpect(jsonPath("$.items[0].status").value("APPROVED"))
                .andExpect(jsonPath("$.items[0].modelAnswer").doesNotExist())
                .andExpect(jsonPath("$.items[0].authorId").doesNotExist())
                .andExpect(jsonPath("$.items[1].id").value(mine.getId().toString()))
                .andExpect(jsonPath("$.items[1].isMine").value(true))
                .andExpect(jsonPath("$.items[1].isReported").value(false))
                .andExpect(jsonPath("$.items[2].isLiked").value(false))
                .andExpect(jsonPath("$.items[2].isReported").value(false))
                .andExpect(jsonPath("$.majorCounts.CS").value(3))
                .andExpect(jsonPath("$.majorCounts.PERSONALITY").value(1));
    }

    @Test
    void 검색과_분류와_본인_좋아요_필터를_조합해도_대분류_전체_건수는_유지한다() throws Exception {
        Category os = category(QuestionMajor.CS, "운영체제");
        Question found = adminQuestion(QuestionMajor.CS, os, "프로\u00A0세스 PROCESS THREAD 차이입니다.");
        Question network = adminQuestion(QuestionMajor.CS, category(QuestionMajor.CS, "네트워크"), "PROCESS 네트워크 질문");
        adminQuestion(QuestionMajor.CS, os, "검색어와 관계없는 다른 질문입니다.");
        like(1L, found);
        like(2L, network);
        adminQuestion(QuestionMajor.PERSONALITY, null, "중분류 없는 인성 질문입니다.");
        adminQuestion(QuestionMajor.PERSONALITY, category(QuestionMajor.PERSONALITY, "협업"), "협업 경험 질문입니다.");
        flushAndClear();

        mockMvc.perform(get(PATH).principal(member)
                        .param("categoryId", os.getId().toString())
                        .param("keyword", " pRo CESS ")
                        .param("likedOnly", "true").param("pageSize", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].id").value(found.getId().toString()))
                .andExpect(jsonPath("$.items[0].isLiked").value(true))
                .andExpect(jsonPath("$.totalCount").value(1))
                .andExpect(jsonPath("$.pageSize").value(2))
                .andExpect(jsonPath("$.majorCounts.CS").value(3))
                .andExpect(jsonPath("$.majorCounts.PERSONALITY").value(2));
    }

    @Test
    void 큰_요청_페이지는_마지막으로_보정하고_요청한_페이지_크기는_유지한다() throws Exception {
        Category os = category(QuestionMajor.CS, "운영체제");
        Question first = adminQuestion(QuestionMajor.CS, os, "페이지 첫 번째 질문입니다.");
        for (int i = 0; i < 4; i++) {
            adminQuestion(QuestionMajor.CS, os, "페이지 추가 질문 " + i);
        }
        entityManager.flush();
        entityManager.createQuery("update Question question set question.createdAt = :createdAt")
                .setParameter("createdAt", Instant.parse("2026-11-26T00:00:00Z"))
                .executeUpdate();
        entityManager.clear();

        mockMvc.perform(get(PATH).principal(member).param("page", Integer.toString(Integer.MAX_VALUE))
                        .param("pageSize", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCount").value(5))
                .andExpect(jsonPath("$.page").value(3))
                .andExpect(jsonPath("$.pageSize").value(2))
                .andExpect(jsonPath("$.totalPages").value(3))
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].id").value(first.getId().toString()));
    }

    @Test
    void 검색_결과가_없으면_빈_목록과_첫_페이지를_반환한다() throws Exception {
        adminQuestion(QuestionMajor.CS, category(QuestionMajor.CS, "운영체제"), "존재하는 공개 질문입니다.");
        flushAndClear();

        mockMvc.perform(get(PATH).principal(member).param("keyword", "없는검색어")
                        .param("page", "999").param("pageSize", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty())
                .andExpect(jsonPath("$.totalCount").value(0))
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.pageSize").value(20))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.majorCounts.CS").value(1))
                .andExpect(jsonPath("$.majorCounts.PERSONALITY").value(0));
    }

    @Test
    void 중분류_없는_인성_질문도_null_카테고리로_조회한다() throws Exception {
        Question question = adminQuestion(QuestionMajor.PERSONALITY, null, "개인 경험을 설명해 주세요.");
        flushAndClear();

        mockMvc.perform(get(PATH).principal(member).param("major", "PERSONALITY"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCount").value(1))
                .andExpect(jsonPath("$.items[0].id").value(question.getId().toString()))
                .andExpect(jsonPath("$.items[0].category").value(nullValue()));
    }

    @Test
    void 없는_카테고리와_대분류가_다른_카테고리를_거절한다() throws Exception {
        Long personalityId = category(QuestionMajor.PERSONALITY, "협업").getId();
        for (String id : new String[] {Long.toString(Long.MAX_VALUE), personalityId.toString()}) {
            mockMvc.perform(get(PATH).principal(member).param("categoryId", id))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("INVALID_CATEGORY"));
        }
    }

    @Test
    void 페이지가_커져도_개인화_정보를_질문마다_추가_조회하지_않는다() {
        Category os = category(QuestionMajor.CS, "운영체제");
        for (int i = 0; i < 10; i++) {
            Question question = adminQuestion(QuestionMajor.CS, os, "묶음 조회 테스트 질문 " + i);
            like(1L, question);
            report(2L, question);
        }
        flushAndClear();
        var statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        var actor = new QuestionMember(1L, Role.USER);

        statistics.clear();
        var small = questionQueryService.getQuestions(query(1), actor);
        long smallQueries = statistics.getPrepareStatementCount();
        statistics.clear();
        var large = questionQueryService.getQuestions(query(10), actor);
        long largeQueries = statistics.getPrepareStatementCount();

        assertThat(small.items()).hasSize(1);
        assertThat(large.items()).hasSize(10);
        assertThat(largeQueries).isEqualTo(smallQueries);
        assertThat(large.items()).allSatisfy(item -> {
            assertThat(item.likeCount()).isEqualTo(1);
            assertThat(item.isLiked()).isTrue();
            assertThat(item.isReported()).isFalse();
        });
    }

    private QuestionSearchRequest query(int pageSize) {
        return new QuestionSearchRequest(null, null, null, null, null, 1, pageSize);
    }

    private Category category(QuestionMajor major, String name) {
        return entityManager.createQuery("select category from Category category where category.major = :major and category.name = :name", Category.class)
                .setParameter("major", major).setParameter("name", name).getSingleResult();
    }

    private Question adminQuestion(QuestionMajor major, Category category, String content) {
        return persist(Question.createByAdmin(major, category, content, "목록에서 노출하지 않는 답안", null, 99L));
    }

    private Question approvedUser(Category category, String content, Long authorId) {
        Question question = Question.createByUser(QuestionMajor.CS, category, content, authorId);
        question.approve(99L);
        return persist(question);
    }

    private Question persist(Question question) {
        entityManager.persist(question);
        return question;
    }

    private void like(Long userId, Question question) {
        entityManager.persist(QuestionLike.create(userId, question));
    }

    private QuestionReport report(Long reporterId, Question question) {
        QuestionReport report = QuestionReport.builder().question(question).reporterId(reporterId)
                .reasonType(ReportReasonType.ETC).reason("신고 테스트").build();
        entityManager.persist(report);
        return report;
    }

    private void flushAndClear() {
        entityManager.flush();
        entityManager.clear();
    }

    private record TestPrincipal(Long userId, Role role, UserStatus status, Instant deletedAt)
            implements QuestionPrincipal {
    }
}
