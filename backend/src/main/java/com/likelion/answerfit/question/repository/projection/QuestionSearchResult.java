package com.likelion.answerfit.question.repository.projection;

import java.util.List;

public record QuestionSearchResult(
        List<QuestionListRow> items,
        long totalCount,
        int page,
        int pageSize,
        long totalPages
) {

    public QuestionSearchResult {
        items = List.copyOf(items);
    }
}
