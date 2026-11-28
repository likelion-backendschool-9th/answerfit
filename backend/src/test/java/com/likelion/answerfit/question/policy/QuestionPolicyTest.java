package com.likelion.answerfit.question.policy;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

import com.likelion.answerfit.question.auth.QuestionMember;
import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.Question;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.exception.QuestionErrorCode;
import com.likelion.answerfit.question.exception.QuestionException;
import com.likelion.answerfit.user.entity.Role;

class QuestionPolicyTest {

    private final Category os = Category.builder().major(QuestionMajor.CS).name("운영체제").build();
    private final QuestionMember author = new QuestionMember(1L, Role.USER);
    private final QuestionMember other = new QuestionMember(2L, Role.USER);
    private final QuestionMember admin = new QuestionMember(99L, Role.ADMIN);

    @Test
    void 승인_직후와_답안_생성_실패_후에도_질문은_공개된다() {
        Question question = userQuestion();
        question.approve(admin.userId());

        assertThat(QuestionPolicy.isPublic(question)).isTrue();
        assertThat(QuestionPolicy.canView(question, other)).isTrue();
        assertThat(QuestionPolicy.canEdit(question, author)).isFalse();

        question.failModelAnswer();

        assertThat(QuestionPolicy.isPublic(question)).isTrue();
        assertThat(QuestionPolicy.canView(question, author)).isTrue();
    }

    @Test
    void 승인대기와_반려_질문은_본인만_조회하고_수정할_수_있다() {
        Question question = userQuestion();
        assertPrivateEditable(question);

        question.reject(admin.userId());
        assertPrivateEditable(question);
    }

    @Test
    void 승인된_본인_질문도_수정하거나_신고할_수_없다() {
        Question question = userQuestion();
        question.approve(admin.userId());

        assertThat(QuestionPolicy.isMine(question, author)).isTrue();
        assertThat(QuestionPolicy.canEdit(question, author)).isFalse();
        assertThat(QuestionPolicy.canReport(question, author)).isFalse();
        assertThat(QuestionPolicy.canReport(question, other)).isTrue();
    }

    @Test
    void 숨김과_삭제_질문은_작성자에게도_공개되지_않는다() {
        Question hidden = userQuestion();
        hidden.approve(admin.userId());
        hidden.hide();

        Question deleted = userQuestion();
        deleted.delete();

        for (Question question : new Question[] {hidden, deleted}) {
            assertThat(QuestionPolicy.isPublic(question)).isFalse();
            assertThat(QuestionPolicy.canView(question, author)).isFalse();
            assertThat(QuestionPolicy.canEdit(question, author)).isFalse();
            assertThat(QuestionPolicy.canReport(question, other)).isFalse();
        }
    }

    @Test
    void 관리자_등록은_직접_작성한_답안_상태가_null이어도_공개된다() {
        Question question = Question.createByAdmin(QuestionMajor.CS, os, "프로세스와 스레드의 차이는?",
                "프로세스는 실행 중인 프로그램입니다.", null, admin.userId());

        assertThat(QuestionPolicy.isPublic(question)).isTrue();
        assertThat(QuestionPolicy.isMine(question, admin)).isFalse();
        assertThat(QuestionPolicy.canEdit(question, admin)).isFalse();
    }

    @Test
    void 인증_회원이_없거나_질문이_없으면_권한을_부여하지_않는다() {
        Question question = userQuestion();
        question.approve(admin.userId());

        assertThat(QuestionPolicy.canView(question, null)).isFalse();
        assertThat(QuestionPolicy.canEdit(question, null)).isFalse();
        assertThat(QuestionPolicy.canReport(question, null)).isFalse();
        assertThat(QuestionPolicy.canView(null, author)).isFalse();
        assertThat(QuestionPolicy.canEdit(null, author)).isFalse();
        assertThat(QuestionPolicy.canReport(null, author)).isFalse();
    }

    @Test
    void 사용자_질문의_카테고리는_CS여야_한다() {
        Category personality = Category.builder().major(QuestionMajor.PERSONALITY).name("협업").build();

        assertThatCode(() -> QuestionPolicy.requireCsCategory(os)).doesNotThrowAnyException();
        assertInvalidCategory(null);
        assertInvalidCategory(personality);
    }

    private Question userQuestion() {
        return Question.createByUser(QuestionMajor.CS, os, "프로세스와 스레드의 차이는?", author.userId());
    }

    private void assertPrivateEditable(Question question) {
        assertThat(QuestionPolicy.isPublic(question)).isFalse();
        assertThat(QuestionPolicy.canView(question, author)).isTrue();
        assertThat(QuestionPolicy.canEdit(question, author)).isTrue();
        assertThat(QuestionPolicy.canReport(question, author)).isFalse();
        assertThat(QuestionPolicy.canView(question, other)).isFalse();
        assertThat(QuestionPolicy.canEdit(question, other)).isFalse();
        assertThat(QuestionPolicy.canView(question, admin)).isFalse();
    }

    private void assertInvalidCategory(Category category) {
        assertThatThrownBy(() -> QuestionPolicy.requireCsCategory(category))
                .isInstanceOfSatisfying(QuestionException.class,
                        error -> assertThat(error.getErrorCode()).isEqualTo(QuestionErrorCode.INVALID_CATEGORY));
    }
}
