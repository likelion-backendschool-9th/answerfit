package com.likelion.answerfit.question.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.data.domain.PageRequest;

import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.ModerationType;
import com.likelion.answerfit.question.entity.Question;
import com.likelion.answerfit.question.entity.QuestionLike;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.entity.QuestionModeration;
import com.likelion.answerfit.question.entity.QuestionReport;
import com.likelion.answerfit.question.entity.ReportReasonType;
import com.likelion.answerfit.question.repository.projection.QuestionInteractionCount;
import com.likelion.answerfit.question.repository.projection.QuestionNeighbor;

@DataJpaTest
class QuestionDetailRepositoryTest {

    private static final Instant ANCHOR = Instant.parse("2026-11-26T00:00:00Z");
    private static final PageRequest ONE = PageRequest.of(0, 1);

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void 상세의_카테고리를_함께_조회하고_인성의_null_카테고리도_허용한다() {
        Category os = category(QuestionMajor.CS, "운영체제");
        Question cs = approved(os, "CS 질문");
        Question personality = approved(null, "인성 공통 질문");
        flushAndClear();

        Question detail = questionRepository.findDetailById(cs.getId()).orElseThrow();
        assertThat(entityManager.getEntityManager().getEntityManagerFactory().getPersistenceUnitUtil()
                .isLoaded(detail, "category")).isTrue();
        entityManager.clear();
        assertThat(detail.getCategory().getName()).isEqualTo("운영체제");
        assertThat(questionRepository.findDetailById(personality.getId()).orElseThrow().getCategory()).isNull();
    }

    @Test
    void 비공개_질문도_로드하고_접근_권한은_서비스에서_판정하게_한다() {
        Category os = category(QuestionMajor.CS, "운영체제");
        Question pending = user(os);
        Question rejected = user(os);
        rejected.reject(99L);
        Question hidden = approved(os, "숨김 질문");
        hidden.hide();
        flushAndClear();

        for (Question question : List.of(pending, rejected, hidden)) {
            Question detail = questionRepository.findDetailById(question.getId()).orElseThrow();
            assertThat(detail.getStatus()).isEqualTo(question.getStatus());
            assertThat(questionRepository.findInteractions(question.getId(), 1L))
                    .contains(new QuestionInteractionCount(0, 0, 0));
        }
    }

    @Test
    void 삭제된_질문과_없는_질문은_상세와_상호작용_조회에서_제외한다() {
        Category os = category(QuestionMajor.CS, "운영체제");
        Question deleted = approved(os, "삭제된 질문");
        deleted.addKeyword("보존된 키워드");
        deleted.deleteByAdmin();
        flushAndClear();

        for (Long id : List.of(deleted.getId(), Long.MAX_VALUE)) {
            assertThat(questionRepository.findDetailById(id)).isEmpty();
            assertThat(questionRepository.findInteractions(id, 1L)).isEmpty();
            assertThat(questionRepository.findKeywords(id)).isEmpty();
            assertThat(questionRepository.findRejectionReasons(id, ONE)).isEmpty();
        }
    }

    @Test
    void 좋아요와_신고를_독립_집계하고_회원별_선택과_처리된_신고를_구분한다() {
        Question question = approved(category(QuestionMajor.CS, "운영체제"), "상호작용 질문");
        entityManager.persist(QuestionLike.create(1L, question));
        entityManager.persist(QuestionLike.create(2L, question));
        report(question, 1L).dismiss(99L);
        QuestionModeration action = moderation(question, ModerationType.REPORT, "내용 확인");
        report(question, 2L).accept(action, 99L);
        report(question, 3L);
        flushAndClear();

        assertThat(questionRepository.findInteractions(question.getId(), 1L))
                .contains(new QuestionInteractionCount(2, 1, 1));
        assertThat(questionRepository.findInteractions(question.getId(), 2L))
                .contains(new QuestionInteractionCount(2, 1, 1));
        assertThat(questionRepository.findInteractions(question.getId(), 3L))
                .contains(new QuestionInteractionCount(2, 0, 1));
        assertThat(questionRepository.findInteractions(question.getId(), 4L))
                .contains(new QuestionInteractionCount(2, 0, 0));
    }

    @Test
    void 키워드는_표시순서와_ID순으로_조회한다() {
        Question question = approved(category(QuestionMajor.CS, "운영체제"), "키워드 질문");
        question.addKeyword("프로세스");
        question.addKeyword("스레드");
        question.addKeyword("실행");
        entityManager.flush();
        entityManager.getEntityManager().createQuery("""
                update QuestionKeyword keyword
                set keyword.sortOrder = 10
                where keyword.question.id = :questionId
                """).setParameter("questionId", question.getId()).executeUpdate();
        entityManager.getEntityManager().createQuery("""
                update QuestionKeyword keyword
                set keyword.sortOrder = 0
                where keyword.question.id = :questionId and keyword.keyword = '실행'
                """).setParameter("questionId", question.getId()).executeUpdate();
        entityManager.clear();

        assertThat(questionRepository.findKeywords(question.getId())).containsExactly("실행", "프로세스", "스레드");
    }

    @Test
    void 신고_조치를_제외하고_가장_최근의_반려_사유를_시각과_ID로_선택한다() {
        Question question = user(category(QuestionMajor.CS, "운영체제"));
        QuestionModeration old = moderation(question, ModerationType.REJECT, "이전 반려");
        QuestionModeration recent = moderation(question, ModerationType.REJECT, "최근 반려");
        QuestionModeration sameTime = moderation(question, ModerationType.REJECT, "같은 시각의 마지막 반려");
        QuestionModeration report = moderation(question, ModerationType.REPORT, "더 최근의 신고 조치");
        entityManager.flush();
        moderationTime(old, ANCHOR.minusSeconds(3600));
        moderationTime(recent, ANCHOR);
        moderationTime(sameTime, ANCHOR);
        moderationTime(report, ANCHOR.plusSeconds(3600));
        entityManager.clear();

        assertThat(questionRepository.findRejectionReasons(question.getId(), ONE))
                .containsExactly("같은 시각의 마지막 반려");
        assertThat(questionRepository.findRejectionReasons(question.getId(), PageRequest.of(0, 3)))
                .containsExactly("같은 시각의 마지막 반려", "최근 반려", "이전 반려");
    }

    @Test
    void 앞뒤_질문은_같은_분류의_공개_질문만_시각과_ID로_정렬해_선택한다() {
        Category os = category(QuestionMajor.CS, "운영체제");
        Question oldest = approved(os, "가장 오래된 질문");
        Question sameOlder = approved(os, "동일 시각 앞선 ID");
        Question current = approved(os, "현재 질문");
        Question sameNewer = approved(os, "동일 시각 나중 ID");
        Question newest = approved(os, "가장 최신 질문");
        approved(category(QuestionMajor.CS, "네트워크"), "다른 중분류");
        approved(category(QuestionMajor.PERSONALITY, "협업"), "다른 대분류");
        Question hidden = approved(os, "숨김 질문");
        hidden.hide();
        Question deleted = approved(os, "삭제 질문");
        deleted.deleteByAdmin();
        user(os);
        entityManager.flush();
        entityManager.getEntityManager().createQuery("update Question question set question.createdAt = :time")
                .setParameter("time", ANCHOR).executeUpdate();
        questionTime(oldest, ANCHOR.minusSeconds(3600));
        questionTime(newest, ANCHOR.plusSeconds(3600));
        entityManager.clear();

        assertThat(questionRepository.findPrevious(QuestionMajor.CS, os.getId(), ANCHOR, current.getId(), ONE))
                .containsExactly(new QuestionNeighbor(sameNewer.getId(), sameNewer.getContent()));
        assertThat(questionRepository.findNext(QuestionMajor.CS, os.getId(), ANCHOR, current.getId(), ONE))
                .containsExactly(new QuestionNeighbor(sameOlder.getId(), sameOlder.getContent()));
        assertThat(questionRepository.findPrevious(QuestionMajor.CS, os.getId(), ANCHOR.plusSeconds(3600),
                newest.getId(), ONE)).isEmpty();
        assertThat(questionRepository.findNext(QuestionMajor.CS, os.getId(), ANCHOR.minusSeconds(3600),
                oldest.getId(), ONE)).isEmpty();
    }

    @Test
    void 중분류_없는_인성_질문의_앞뒤에서도_null_분류를_유지한다() {
        Question older = approved(null, "이전 인성 공통 질문");
        Question current = approved(null, "현재 인성 공통 질문");
        Question newer = approved(null, "다음 인성 공통 질문");
        approved(category(QuestionMajor.PERSONALITY, "협업"), "중분류 있는 인성 질문");
        entityManager.flush();
        entityManager.getEntityManager().createQuery("update Question question set question.createdAt = :time")
                .setParameter("time", ANCHOR).executeUpdate();
        entityManager.clear();

        assertThat(questionRepository.findPrevious(QuestionMajor.PERSONALITY, null, ANCHOR, current.getId(), ONE))
                .containsExactly(new QuestionNeighbor(newer.getId(), newer.getContent()));
        assertThat(questionRepository.findNext(QuestionMajor.PERSONALITY, null, ANCHOR, current.getId(), ONE))
                .containsExactly(new QuestionNeighbor(older.getId(), older.getContent()));
    }

    private Category category(QuestionMajor major, String name) {
        return entityManager.persist(Category.builder().major(major).name(name).sortOrder(10).build());
    }

    private Question approved(Category category, String content) {
        QuestionMajor major = category == null ? QuestionMajor.PERSONALITY : category.getMajor();
        return entityManager.persist(Question.createByAdmin(major, category, content, null, null, 99L));
    }

    private Question user(Category category) {
        return entityManager.persist(Question.createByUser(QuestionMajor.CS, category, "프로세스와 스레드의 차이는?", 1L));
    }

    private QuestionReport report(Question question, long userId) {
        return entityManager.persist(QuestionReport.builder().question(question).reporterId(userId)
                .reasonType(ReportReasonType.ETC).reason("내용 확인").build());
    }

    private QuestionModeration moderation(Question question, ModerationType type, String reason) {
        return entityManager.persist(QuestionModeration.builder().question(question).moderationType(type)
                .reason(reason).moderatorId(99L).build());
    }

    private void questionTime(Question question, Instant time) {
        entityManager.getEntityManager().createQuery("update Question question set question.createdAt = :time where question.id = :id")
                .setParameter("time", time).setParameter("id", question.getId()).executeUpdate();
    }

    private void moderationTime(QuestionModeration moderation, Instant time) {
        entityManager.getEntityManager().createQuery("""
                update QuestionModeration moderation set moderation.createdAt = :time where moderation.id = :id
                """).setParameter("time", time).setParameter("id", moderation.getId()).executeUpdate();
    }

    private void flushAndClear() {
        entityManager.flush();
        entityManager.clear();
    }
}
