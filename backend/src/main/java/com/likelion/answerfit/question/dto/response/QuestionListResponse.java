package com.likelion.answerfit.question.dto.response;

import java.util.List;
import java.util.Map;

import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.entity.QuestionStatus;

public record QuestionListResponse(
        List<Item> items,
        long totalCount,
        int page,
        int pageSize,
        long totalPages,
        Map<QuestionMajor, Long> majorCounts
) {

    public QuestionListResponse {
        items = List.copyOf(items);
        majorCounts = Map.copyOf(majorCounts);
    }

    public record Item(
            String id,
            QuestionMajor major,
            CategoryItem category,
            String content,
            QuestionStatus status,
            long likeCount,
            boolean isLiked,
            boolean isMine,
            boolean isReported
    ) {
    }

    public record CategoryItem(String id, String name) {
    }
}
