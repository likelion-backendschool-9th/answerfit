package com.likelion.answerfit.question.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;

import com.likelion.answerfit.question.dto.QuestionSort;
import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.ModerationType;
import com.likelion.answerfit.question.entity.Question;
import com.likelion.answerfit.question.entity.QuestionLike;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.entity.QuestionModeration;
import com.likelion.answerfit.question.entity.QuestionReport;
import com.likelion.answerfit.question.entity.ReportReasonType;
import com.likelion.answerfit.question.exception.QuestionErrorCode;
import com.likelion.answerfit.question.exception.QuestionException;
import com.likelion.answerfit.question.repository.projection.QuestionListRow;
import com.likelion.answerfit.question.repository.projection.QuestionSearchResult;
import com.likelion.answerfit.question.validation.QuestionText;

@DataJpaTest
class QuestionRepositoryTest {

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void 승인된_미삭제_질문만_검색하며_답안_상태는_공개를_제한하지_않는다() {
        Category os = category(QuestionMajor.CS, "운영체제");
        Question admin = adminQuestion(QuestionMajor.CS, os, "관리자가 직접 만든 질문");
        Question generating = userQuestion(os);
        generating.approve(99L);
        Question failed = userQuestion(os);
        failed.approve(99L);
        failed.failModelAnswer();
        userQuestion(os);
        Question rejected = userQuestion(os);
        rejected.reject(99L);
        Question hidden = adminQuestion(QuestionMajor.CS, os, "숨김 질문");
        hidden.hide();
        Question deleted = adminQuestion(QuestionMajor.CS, os, "삭제 질문");
        deleted.deleteByAdmin();
        flushAndClear();

        QuestionSearchResult result = search(QuestionMajor.CS, null, "", false, QuestionSort.LATEST, 1L, 1, 7);

        assertThat(result.totalCount()).isEqualTo(3);
        assertThat(result.items()).extracting(QuestionListRow::id)
                .containsExactlyInAnyOrder(admin.getId(), generating.getId(), failed.getId());
    }

    @Test
    void 중분류_없는_인성_질문을_보존하고_대분류와_카테고리를_필터링한다() {
        Category cs = category(QuestionMajor.CS, "운영체제");
        Category personality = category(QuestionMajor.PERSONALITY, "협업");
        adminQuestion(QuestionMajor.CS, cs, "CS 질문");
        Question categorized = adminQuestion(QuestionMajor.PERSONALITY, personality, "협업 질문");
        Question uncategorized = adminQuestion(QuestionMajor.PERSONALITY, null, "인성 공통 질문");
        flushAndClear();

        QuestionSearchResult allPersonality = search(QuestionMajor.PERSONALITY, null, "", false,
                QuestionSort.LATEST, 1L, 1, 7);
        assertThat(allPersonality.items()).extracting(QuestionListRow::id)
                .containsExactlyInAnyOrder(categorized.getId(), uncategorized.getId());
        assertThat(allPersonality.items()).filteredOn(row -> row.id().equals(uncategorized.getId()))
                .extracting(QuestionListRow::categoryId, QuestionListRow::categoryName)
                .containsExactly(tuple(null, null));

        QuestionSearchResult filtered = search(QuestionMajor.PERSONALITY, personality.getId(), "", false,
                QuestionSort.LATEST, 1L, 1, 7);
        assertThat(filtered.items()).extracting(QuestionListRow::id).containsExactly(categorized.getId());
        assertThat(filtered.totalCount()).isEqualTo(1);
    }

    @Test
    void 검색은_대소문자와_브라우저_공백을_무시하고_한국어를_포함_검색한다() {
        Category os = category(QuestionMajor.CS, "운영체제");
        Question ascii = adminQuestion(QuestionMajor.CS, os, "HTTP\t프로세스\n격리\u00A0수준\uFEFF설명");
        adminQuestion(QuestionMajor.CS, os, "독립적인 네트워크 질문");
        flushAndClear();

        assertThat(search(QuestionMajor.CS, null, "hTtP 프로세스 격리 수준", false,
                QuestionSort.LATEST, 1L, 1, 7).items()).extracting(QuestionListRow::id)
                .containsExactly(ascii.getId());
        assertThat(search(QuestionMajor.CS, null, "격리수준", false,
                QuestionSort.LATEST, 1L, 1, 7).items()).extracting(QuestionListRow::id)
                .containsExactly(ascii.getId());
    }

    @Test
    void 모든_브라우저_공백을_본문과_검색어에서_동일하게_제거한다() {
        Category os = category(QuestionMajor.CS, "운영체제");
        Question question = adminQuestion(QuestionMajor.CS, os,
                "HTTP" + QuestionText.SEARCH_WHITESPACE + "응답");
        flushAndClear();

        assertThat(search(QuestionMajor.CS, null, "h t t p 응 답", false,
                QuestionSort.LATEST, 1L, 1, 7).items()).extracting(QuestionListRow::id)
                .containsExactly(question.getId());
    }

    @Test
    void LIKE_예약문자와_따옴표는_검색_데이터로_취급한다() {
        Category os = category(QuestionMajor.CS, "운영체제");
        Question literal = adminQuestion(QuestionMajor.CS, os, "사용률 100% file_name! 'quoted' 질문");
        adminQuestion(QuestionMajor.CS, os, "사용률 1000 fileXname 질문");
        flushAndClear();

        for (String keyword : new String[] {"100%", "file_name", "name!", "'quoted'"}) {
            assertThat(search(QuestionMajor.CS, null, keyword, false,
                    QuestionSort.LATEST, 1L, 1, 7).items()).extracting(QuestionListRow::id)
                    .containsExactly(literal.getId());
        }
        assertThat(search(QuestionMajor.CS, null, "' OR 1=1 --", false,
                QuestionSort.LATEST, 1L, 1, 7).items()).isEmpty();
    }

    @Test
    void 좋아요_총수와_본인_선택_및_신고_여부를_독립적으로_조회한다() {
        Category os = category(QuestionMajor.CS, "운영체제");
        Question mine = adminQuestion(QuestionMajor.CS, os, "내가 좋아요한 질문");
        Question others = adminQuestion(QuestionMajor.CS, os, "다른 회원만 좋아요한 질문");
        like(1L, mine);
        like(2L, mine);
        like(2L, others);
        report(1L, mine);
        report(2L, mine);
        report(2L, others);
        flushAndClear();

        QuestionSearchResult firstMember = search(QuestionMajor.CS, null, "", false,
                QuestionSort.LATEST, 1L, 1, 7);
        assertThat(firstMember.totalCount()).isEqualTo(2);
        assertThat(firstMember.items()).extracting(QuestionListRow::id, QuestionListRow::likeCount,
                        QuestionListRow::liked, QuestionListRow::reported)
                .containsExactlyInAnyOrder(tuple(mine.getId(), 2L, true, true),
                        tuple(others.getId(), 1L, false, false));

        QuestionSearchResult thirdMember = search(QuestionMajor.CS, null, "", false,
                QuestionSort.LATEST, 3L, 1, 7);
        assertThat(thirdMember.items()).extracting(QuestionListRow::likeCount,
                        QuestionListRow::liked, QuestionListRow::reported)
                .containsExactlyInAnyOrder(tuple(2L, false, false), tuple(1L, false, false));
    }

    @Test
    void 좋아요_필터는_현재_회원의_공개_질문만_포함한다() {
        Category os = category(QuestionMajor.CS, "운영체제");
        Question matching = adminQuestion(QuestionMajor.CS, os, "좋아요한 프로세스 질문");
        Question others = adminQuestion(QuestionMajor.CS, os, "프로세스 다른 회원 질문");
        Question hidden = adminQuestion(QuestionMajor.CS, os, "프로세스 숨김 질문");
        like(1L, matching);
        like(2L, others);
        like(1L, hidden);
        hidden.hide();
        flushAndClear();

        QuestionSearchResult result = search(QuestionMajor.CS, os.getId(), "프로세스", true,
                QuestionSort.LATEST, 1L, 1, 7);
        assertThat(result.items()).extracting(QuestionListRow::id).containsExactly(matching.getId());
        assertThat(result.totalCount()).isEqualTo(1);
        assertThat(search(QuestionMajor.CS, null, "", true,
                QuestionSort.LATEST, 3L, 1, 7).items()).isEmpty();
    }

    @Test
    void 처리한_신고도_본인의_신고_여부에_반영한다() {
        Category os = category(QuestionMajor.CS, "운영체제");
        Question dismissed = adminQuestion(QuestionMajor.CS, os, "신고 기각 질문");
        Question accepted = adminQuestion(QuestionMajor.CS, os, "신고 처리 질문");
        report(1L, dismissed).dismiss(99L);
        QuestionModeration moderation = entityManager.persist(QuestionModeration.builder()
                .question(accepted).moderationType(ModerationType.REPORT).reason("내용 확인").moderatorId(99L).build());
        report(1L, accepted).accept(moderation, 99L);
        flushAndClear();

        assertThat(search(QuestionMajor.CS, null, "", false,
                QuestionSort.LATEST, 1L, 1, 7).items())
                .extracting(QuestionListRow::reported).containsExactly(true, true);
    }

    @Test
    void 최신순과_좋아요순의_동점은_ID_내림차순으로_안정적으로_정렬한다() {
        Category os = category(QuestionMajor.CS, "운영체제");
        Question first = adminQuestion(QuestionMajor.CS, os, "첫 번째 질문");
        Question second = adminQuestion(QuestionMajor.CS, os, "두 번째 질문");
        Question third = adminQuestion(QuestionMajor.CS, os, "세 번째 질문");
        like(1L, first);
        like(1L, second);
        flushAndClear();
        entityManager.getEntityManager().createQuery("update Question question set question.createdAt = :createdAt")
                .setParameter("createdAt", Instant.parse("2026-11-26T00:00:00Z"))
                .executeUpdate();
        entityManager.clear();

        assertThat(search(QuestionMajor.CS, null, "", false,
                QuestionSort.LATEST, 1L, 1, 7).items()).extracting(QuestionListRow::id)
                .containsExactly(third.getId(), second.getId(), first.getId());
        assertThat(search(QuestionMajor.CS, null, "", false,
                QuestionSort.LIKES, 1L, 1, 7).items()).extracting(QuestionListRow::id)
                .containsExactly(second.getId(), first.getId(), third.getId());
    }

    @Test
    void 요청한_크기로_페이지를_나누고_범위_초과는_마지막_페이지로_보정한다() {
        Category os = category(QuestionMajor.CS, "운영체제");
        for (int index = 0; index < 5; index++) {
            adminQuestion(QuestionMajor.CS, os, "페이지 질문 " + index);
        }
        flushAndClear();

        QuestionSearchResult first = search(QuestionMajor.CS, null, "", false,
                QuestionSort.LATEST, 1L, 1, 2);
        QuestionSearchResult last = search(QuestionMajor.CS, null, "", false,
                QuestionSort.LATEST, 1L, Integer.MAX_VALUE, 2);

        assertThat(first.items()).hasSize(2);
        assertThat(first.totalCount()).isEqualTo(5);
        assertThat(first.totalPages()).isEqualTo(3);
        assertThat(first.pageSize()).isEqualTo(2);
        assertThat(last.page()).isEqualTo(3);
        assertThat(last.items()).hasSize(1);
        assertThat(last.totalCount()).isEqualTo(5);
        assertThat(last.totalPages()).isEqualTo(3);
    }

    @Test
    void 빈_결과의_페이지는_1이고_요청한_페이지_크기를_유지한다() {
        QuestionSearchResult result = search(QuestionMajor.CS, null, "", false,
                QuestionSort.LATEST, 1L, 100, 3);

        assertThat(result.items()).isEmpty();
        assertThat(result.totalCount()).isZero();
        assertThat(result.page()).isEqualTo(1);
        assertThat(result.pageSize()).isEqualTo(3);
        assertThat(result.totalPages()).isEqualTo(1);
    }

    @Test
    void 지원하지_않는_페이지_입력은_명시적으로_거절한다() {
        assertInvalidPage(0, 7);
        assertInvalidPage(1, 0);
        assertInvalidPage(1, 101);
    }

    private QuestionSearchResult search(QuestionMajor major, Long categoryId, String keyword, boolean likedOnly,
                                        QuestionSort sort, long userId, int page, int pageSize) {
        return questionRepository.search(new QuestionSearchCondition(major, categoryId,
                QuestionText.normalizeSearch(keyword), likedOnly, sort, userId), page, pageSize);
    }

    private Category category(QuestionMajor major, String name) {
        return entityManager.persist(Category.builder().major(major).name(name).sortOrder(10).build());
    }

    private Question adminQuestion(QuestionMajor major, Category category, String content) {
        return entityManager.persist(Question.createByAdmin(major, category, content, null, null, 99L));
    }

    private Question userQuestion(Category category) {
        return entityManager.persist(Question.createByUser(QuestionMajor.CS, category, "프로세스와 스레드의 차이는?", 1L));
    }

    private void like(long userId, Question question) {
        entityManager.persist(QuestionLike.create(userId, question));
    }

    private QuestionReport report(long userId, Question question) {
        return entityManager.persist(QuestionReport.builder().question(question).reporterId(userId)
                .reasonType(ReportReasonType.ETC).reason("내용 확인").build());
    }

    private void assertInvalidPage(int page, int pageSize) {
        assertThatThrownBy(() -> search(QuestionMajor.CS, null, "", false,
                QuestionSort.LATEST, 1L, page, pageSize))
                .isInstanceOfSatisfying(QuestionException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(QuestionErrorCode.INVALID_REQUEST));
    }

    private void flushAndClear() {
        entityManager.flush();
        entityManager.clear();
    }
}
