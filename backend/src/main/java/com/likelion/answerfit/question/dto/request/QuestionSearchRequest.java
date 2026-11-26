package com.likelion.answerfit.question.dto.request;

import com.likelion.answerfit.question.dto.QuestionSort;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.validation.CodePointLength;
import com.likelion.answerfit.question.validation.QuestionInputLimits;
import com.likelion.answerfit.question.validation.QuestionText;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;

public record QuestionSearchRequest(
        QuestionMajor major,
        @Positive(message = "카테고리 ID는 양수여야 합니다.")
        Long categoryId,
        @CodePointLength(max = QuestionInputLimits.KEYWORD_MAX)
        String keyword,
        Boolean likedOnly,
        QuestionSort sort,
        @Min(value = 1, message = "페이지는 1 이상이어야 합니다.")
        Integer page,
        @Min(value = 1, message = "페이지 크기는 1 이상이어야 합니다.")
        @Max(value = QuestionInputLimits.PAGE_SIZE_MAX, message = "페이지 크기는 100 이하여야 합니다.")
        Integer pageSize
) {

    public QuestionSearchRequest {
        major = major == null ? QuestionMajor.CS : major;
        keyword = keyword == null ? "" : QuestionText.trim(keyword);
        likedOnly = likedOnly == null ? false : likedOnly;
        sort = sort == null ? QuestionSort.LATEST : sort;
        page = page == null ? 1 : page;
        pageSize = pageSize == null ? QuestionInputLimits.DEFAULT_PAGE_SIZE : pageSize;
    }
}
