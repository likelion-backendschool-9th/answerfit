package com.likelion.answerfit.question.validation;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class QuestionTextTest {

    @Test
    void 프론트에서_제거하는_유니코드_공백과_BOM을_정리한다() {
        assertThat(QuestionText.trim("\uFEFF\u00A0\u1680\u2000\u2028\u2029\u202F\u205F\u3000 내용 \r\n\t"))
                .isEqualTo("내용");
    }

    @Test
    void 내부_공백과_코드포인트를_보존한다() {
        assertThat(QuestionText.trim("  😀 프로세스\n스레드 😀  ")).isEqualTo("😀 프로세스\n스레드 😀");
    }

    @Test
    void null은_선택적_수정값으로_보존한다() {
        assertThat(QuestionText.trim(null)).isNull();
    }

    @Test
    void 브라우저가_공백으로_취급하지_않는_제어문자는_임의로_제거하지_않는다() {
        assertThat(QuestionText.trim("\u001C내용\u001F")).isEqualTo("\u001C내용\u001F");
    }

    @Test
    void 검색은_영문_대소문자와_브라우저_공백을_무시한다() {
        assertThat(QuestionText.normalizeSearch(" PRO\u00A0CESS\t\n프로\u3000세스\uFEFF "))
                .isEqualTo("process프로세스");
        assertThat(QuestionText.normalizeSearch(QuestionText.SEARCH_WHITESPACE)).isEmpty();
        assertThat(QuestionText.normalizeSearch(null)).isEmpty();
    }

    @Test
    void 검색_특수문자와_이모지는_검색어의_일부로_보존한다() {
        assertThat(QuestionText.normalizeSearch(" 😀 100% A_B ! ")).isEqualTo("😀100%a_b!");
        assertThat(QuestionText.normalizeSearch("\u001CA\u001F")).isEqualTo("\u001Ca\u001F");
    }
}
