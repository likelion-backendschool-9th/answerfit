package com.likelion.answerfit.question.dto.request;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import java.util.stream.Collectors;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import com.likelion.answerfit.question.dto.QuestionSort;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.validation.CodePointLength;
import com.likelion.answerfit.question.validation.QuestionInputLimits;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

class QuestionRequestValidationTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void closeValidator() {
        factory.close();
    }

    @Test
    void 등록_질문의_양끝_공백을_제거한_후_검증한다() {
        CreateQuestionRequest request = new CreateQuestionRequest(1L, "\uFEFF \u00A0프로세스와 스레드의 차이는?\n");

        assertThat(request.content()).isEqualTo("프로세스와 스레드의 차이는?");
        assertThat(validator.validate(request)).isEmpty();
    }

    @Test
    void 등록_카테고리는_양의_ID가_필수다() {
        assertThat(invalidFields(new CreateQuestionRequest(null, "가".repeat(10))))
                .containsExactly("categoryId");
        assertThat(invalidFields(new CreateQuestionRequest(0L, "가".repeat(10))))
                .containsExactly("categoryId");
        assertThat(invalidFields(new CreateQuestionRequest(-1L, "가".repeat(10))))
                .containsExactly("categoryId");
    }

    @Test
    void 질문의_최소_최대_글자수를_검증한다() {
        assertThat(validator.validate(new CreateQuestionRequest(1L, "가".repeat(10)))).isEmpty();
        assertThat(validator.validate(new CreateQuestionRequest(1L, "가".repeat(200)))).isEmpty();
        assertThat(invalidFields(new CreateQuestionRequest(1L, "가".repeat(9))))
                .containsExactly("content");
        assertThat(invalidFields(new CreateQuestionRequest(1L, "가".repeat(201))))
                .containsExactly("content");
    }

    @Test
    void 질문의_필수값과_공백만_있는_입력을_거절한다() {
        assertThat(invalidFields(new CreateQuestionRequest(1L, null))).containsExactly("content");
        assertThat(invalidFields(new CreateQuestionRequest(1L, "\u00A0 \n\uFEFF"))).containsExactly("content");
    }

    @Test
    void 이모지도_프론트와_동일하게_하나의_코드포인트로_센다() {
        assertThat(validator.validate(new CreateQuestionRequest(1L, "😀".repeat(10)))).isEmpty();
        assertThat(validator.validate(new CreateQuestionRequest(1L, "😀".repeat(200)))).isEmpty();
        assertThat(invalidFields(new CreateQuestionRequest(1L, "😀".repeat(9)))).containsExactly("content");
        assertThat(invalidFields(new CreateQuestionRequest(1L, "😀".repeat(201)))).containsExactly("content");
    }

    @Test
    void 수정은_카테고리만_또는_내용만_전달할_수_있다() {
        assertThat(validator.validate(new UpdateQuestionRequest(1L, null))).isEmpty();
        assertThat(validator.validate(new UpdateQuestionRequest(null, "가".repeat(10)))).isEmpty();
        assertThat(validator.validate(new UpdateQuestionRequest(1L, "가".repeat(200)))).isEmpty();
    }

    @Test
    void 수정할_항목이_없는_요청은_거절한다() {
        assertThat(invalidFields(new UpdateQuestionRequest(null, null))).containsExactly("changeRequested");
    }

    @Test
    void 수정_내용을_전달했다면_공백과_길이를_검증한다() {
        assertThat(invalidFields(new UpdateQuestionRequest(1L, " \t\u00A0"))).containsExactly("content");
        assertThat(invalidFields(new UpdateQuestionRequest(null, "가".repeat(9)))).containsExactly("content");
        assertThat(invalidFields(new UpdateQuestionRequest(null, "😀".repeat(201)))).containsExactly("content");
        assertThat(invalidFields(new UpdateQuestionRequest(0L, null))).containsExactly("categoryId");
    }

    @Test
    void 목록_조건이_생략되면_화면의_기본값을_적용한다() {
        QuestionSearchRequest request = new QuestionSearchRequest(null, null, null, null, null, null, null);

        assertThat(request.major()).isEqualTo(QuestionMajor.CS);
        assertThat(request.categoryId()).isNull();
        assertThat(request.keyword()).isEmpty();
        assertThat(request.likedOnly()).isFalse();
        assertThat(request.sort()).isEqualTo(QuestionSort.LATEST);
        assertThat(request.page()).isEqualTo(1);
        assertThat(request.pageSize()).isEqualTo(7);
        assertThat(validator.validate(request)).isEmpty();
    }

    @Test
    void 목록의_명시적인_분류와_좋아요_정렬_페이지_조건을_보존한다() {
        QuestionSearchRequest request = new QuestionSearchRequest(
                QuestionMajor.PERSONALITY, 3L, " 협업 경험 ", true, QuestionSort.LIKES, 2, 20);

        assertThat(request.major()).isEqualTo(QuestionMajor.PERSONALITY);
        assertThat(request.categoryId()).isEqualTo(3L);
        assertThat(request.keyword()).isEqualTo("협업 경험");
        assertThat(request.likedOnly()).isTrue();
        assertThat(request.sort()).isEqualTo(QuestionSort.LIKES);
        assertThat(request.page()).isEqualTo(2);
        assertThat(request.pageSize()).isEqualTo(20);
        assertThat(validator.validate(request)).isEmpty();
    }

    @Test
    void 검색어는_양끝_공백_제거_후_100_코드포인트까지_허용한다() {
        QuestionSearchRequest valid = search(" \u00A0" + "😀".repeat(100) + "\uFEFF ", 1, 7);

        assertThat(valid.keyword()).isEqualTo("😀".repeat(100));
        assertThat(validator.validate(valid)).isEmpty();
        assertThat(invalidFields(search("😀".repeat(101), 1, 7))).containsExactly("keyword");
    }

    @Test
    void 페이지는_1부터_시작하고_크기는_1부터_100까지다() {
        assertThat(validator.validate(search("", 1, 1))).isEmpty();
        assertThat(validator.validate(search("", 1, 100))).isEmpty();
        assertThat(invalidFields(search("", 0, 7))).containsExactly("page");
        assertThat(invalidFields(search("", -1, 7))).containsExactly("page");
        assertThat(invalidFields(search("", 1, 0))).containsExactly("pageSize");
        assertThat(invalidFields(search("", 1, 101))).containsExactly("pageSize");
    }

    @Test
    void 검색에_전달한_카테고리_ID도_양수여야_한다() {
        QuestionSearchRequest request = new QuestionSearchRequest(null, 0L, null, null, null, null, null);

        assertThat(invalidFields(request)).containsExactly("categoryId");
    }

    @Test
    void 신고_상세의_선택값과_300_코드포인트_경계에_길이_검증을_재사용한다() {
        assertThat(validator.validate(new ReportDetail(null))).isEmpty();
        assertThat(validator.validate(new ReportDetail(""))).isEmpty();
        assertThat(validator.validate(new ReportDetail("😀".repeat(300)))).isEmpty();
        assertThat(invalidFields(new ReportDetail("😀".repeat(301)))).containsExactly("detail");
    }

    private static QuestionSearchRequest search(String keyword, int page, int pageSize) {
        return new QuestionSearchRequest(null, null, keyword, null, null, page, pageSize);
    }

    private static Set<String> invalidFields(Object value) {
        return validator.validate(value).stream()
                .map(violation -> violation.getPropertyPath().toString())
                .collect(Collectors.toSet());
    }

    private record ReportDetail(@CodePointLength(max = QuestionInputLimits.REPORT_DETAIL_MAX) String detail) {
    }
}
