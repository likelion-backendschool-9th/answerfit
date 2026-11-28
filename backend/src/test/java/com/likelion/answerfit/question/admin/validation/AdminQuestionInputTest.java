package com.likelion.answerfit.question.admin.validation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Arrays;
import java.util.List;
import java.util.stream.LongStream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import com.likelion.answerfit.global.exception.CustomException;
import com.likelion.answerfit.global.exception.ErrorCode;
import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.QuestionMajor;

class AdminQuestionInputTest {

    @Test
    void 질문은_브라우저와_같이_trim하고_10자와_200자_이모지를_수용한다() {
        for (int size : new int[] {10, 200}) {
            String content = "😀".repeat(size);
            assertThat(AdminQuestionInput.content("\uFEFF\u00A0" + content + "\u3000\n"))
                    .isEqualTo(content);
        }
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 9, 201})
    void 질문_길이_경계_밖의_값을_거절한다(int size) {
        rejects(() -> AdminQuestionInput.content("😀".repeat(size)), ErrorCode.INVALID_INPUT);
    }

    @Test
    void Markdown_답안의_내부_개행과_코드를_보존하고_2000자까지_허용한다() {
        String markdown = "# 제목\n\n```java\nint count = 1;\n```";
        assertThat(AdminQuestionInput.modelAnswer("\n" + markdown + "\n")).isEqualTo(markdown);
        assertThat(AdminQuestionInput.modelAnswer("😀".repeat(2_000))).hasSize(4_000);
        rejects(() -> AdminQuestionInput.modelAnswer("😀".repeat(2_001)), ErrorCode.INVALID_INPUT);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" \n\uFEFF"})
    void 필수_본문과_답안과_조치사유는_빈_값을_거절한다(String value) {
        rejects(() -> AdminQuestionInput.content(value), ErrorCode.INVALID_INPUT);
        rejects(() -> AdminQuestionInput.modelAnswer(value), ErrorCode.INVALID_INPUT);
        rejects(() -> AdminQuestionInput.reason(value), ErrorCode.INVALID_INPUT);
    }

    @Test
    void 힌트는_선택이고_빈_값은_비우며_길이는_코드포인트로_검사한다() {
        assertThat(AdminQuestionInput.hint(null)).isNull();
        assertThat(AdminQuestionInput.hint(" \uFEFF\n")).isNull();
        assertThat(AdminQuestionInput.hint(" \n힌트\n둘째 줄 ")).isEqualTo("힌트\n둘째 줄");
        assertThat(AdminQuestionInput.hint("😀".repeat(2_000))).hasSize(4_000);
        rejects(() -> AdminQuestionInput.hint("😀".repeat(2_001)), ErrorCode.INVALID_INPUT);
    }

    @Test
    void 조치사유는_300개_이모지까지_수용하고_301개는_거절한다() {
        assertThat(AdminQuestionInput.reason(" " + "😀".repeat(300) + " ")).hasSize(600);
        rejects(() -> AdminQuestionInput.reason("😀".repeat(301)), ErrorCode.INVALID_INPUT);
    }

    @Test
    void 키워드는_빈_값과_중복을_제거하고_입력_순서를_유지한다() {
        assertThat(AdminQuestionInput.keywords(List.of(" 스레드 ", "", "\uFEFF", "프로세스", "스레드")))
                .containsExactly("스레드", "프로세스");
        assertThat(AdminQuestionInput.keywords(List.of())).isEmpty();
        assertThat(AdminQuestionInput.keywords(List.of("😀".repeat(20)))).hasSize(1);
        assertThat(AdminQuestionInput.keywords(LongStream.range(0, 10).mapToObj(Long::toString).toList()))
                .hasSize(10);
    }

    @Test
    void 잘못된_키워드_자료형과_길이와_개수를_거절한다() {
        rejects(() -> AdminQuestionInput.keywords(null), ErrorCode.INVALID_INPUT);
        rejects(() -> AdminQuestionInput.keywords(Arrays.asList("정상", null)), ErrorCode.INVALID_INPUT);
        rejects(() -> AdminQuestionInput.keywords(List.of("😀".repeat(21))), ErrorCode.INVALID_INPUT);
        rejects(() -> AdminQuestionInput.keywords(LongStream.range(0, 11).mapToObj(Long::toString).toList()),
                ErrorCode.INVALID_INPUT);
    }

    @Test
    void CS_분류는_필수이고_대분류가_맞아야_하며_인성은_분류가_없어도_된다() {
        Category cs = Category.builder().major(QuestionMajor.CS).name("운영체제").build();
        Category personality = Category.builder().major(QuestionMajor.PERSONALITY).name("협업").build();
        assertThatCode(() -> AdminQuestionInput.requireCategory(QuestionMajor.CS, cs)).doesNotThrowAnyException();
        assertThatCode(() -> AdminQuestionInput.requireCategory(QuestionMajor.PERSONALITY, null))
                .doesNotThrowAnyException();
        rejects(() -> AdminQuestionInput.requireCategory(QuestionMajor.CS, null), ErrorCode.ADMIN_INVALID_CATEGORY);
        rejects(() -> AdminQuestionInput.requireCategory(QuestionMajor.CS, personality), ErrorCode.ADMIN_INVALID_CATEGORY);
        rejects(() -> AdminQuestionInput.requireCategory(QuestionMajor.PERSONALITY, cs), ErrorCode.ADMIN_INVALID_CATEGORY);
        rejects(() -> AdminQuestionInput.requireCategory(null, cs), ErrorCode.INVALID_INPUT);
    }

    @Test
    void 신고_선택은_기준_ID를_포함하고_중복을_제거해_일정한_잠금_순서를_제공한다() {
        assertThat(AdminQuestionInput.reportIds(3L, List.of(3L, 1L, 3L, 2L))).containsExactly(1L, 2L, 3L);
        assertThat(AdminQuestionInput.reportIds(1L, LongStream.rangeClosed(1, 100).boxed().toList())).hasSize(100);
    }

    @Test
    void 신고_기준누락과_잘못된_ID와_과도한_선택을_거절한다() {
        rejects(() -> AdminQuestionInput.reportIds(1L, null), ErrorCode.ADMIN_INVALID_REPORT_SELECTION);
        rejects(() -> AdminQuestionInput.reportIds(1L, List.of()), ErrorCode.ADMIN_INVALID_REPORT_SELECTION);
        rejects(() -> AdminQuestionInput.reportIds(null, List.of(1L)), ErrorCode.ADMIN_INVALID_REPORT_SELECTION);
        rejects(() -> AdminQuestionInput.reportIds(0L, List.of(1L)), ErrorCode.ADMIN_INVALID_REPORT_SELECTION);
        rejects(() -> AdminQuestionInput.reportIds(1L, List.of(2L)), ErrorCode.ADMIN_INVALID_REPORT_SELECTION);
        rejects(() -> AdminQuestionInput.reportIds(1L, List.of(1L, -1L)), ErrorCode.ADMIN_INVALID_REPORT_SELECTION);
        rejects(() -> AdminQuestionInput.reportIds(1L, Arrays.asList(1L, null)), ErrorCode.ADMIN_INVALID_REPORT_SELECTION);
        rejects(() -> AdminQuestionInput.reportIds(1L, LongStream.rangeClosed(1, 101).boxed().toList()),
                ErrorCode.ADMIN_INVALID_REPORT_SELECTION);
    }

    @Test
    void 질문_버전_0은_유효하고_오래된_화면은_상태충돌로_구분한다() {
        assertThatCode(() -> AdminQuestionInput.requireRevision(0, 0L)).doesNotThrowAnyException();
        assertThatCode(() -> AdminQuestionInput.requireRevision(Long.MAX_VALUE, Long.MAX_VALUE))
                .doesNotThrowAnyException();
        rejects(() -> AdminQuestionInput.requireRevision(1, 0L), ErrorCode.ADMIN_REVISION_CONFLICT);
        rejects(() -> AdminQuestionInput.requireRevision(0, null), ErrorCode.INVALID_INPUT);
        rejects(() -> AdminQuestionInput.requireRevision(0, -1L), ErrorCode.INVALID_INPUT);
    }

    private void rejects(Runnable call, ErrorCode code) {
        assertThatThrownBy(call::run).isInstanceOfSatisfying(CustomException.class,
                exception -> assertThat(exception.getErrorCode()).isEqualTo(code));
    }
}
