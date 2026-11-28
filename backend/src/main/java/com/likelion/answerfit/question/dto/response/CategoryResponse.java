package com.likelion.answerfit.question.dto.response;

import java.util.List;

import com.likelion.answerfit.question.entity.QuestionMajor;

public record CategoryResponse(List<MajorGroup> majors) {

    public CategoryResponse {
        majors = List.copyOf(majors);
    }

    public record MajorGroup(QuestionMajor major, String name, long questionCount, List<Item> categories) {

        public MajorGroup {
            categories = List.copyOf(categories);
        }
    }

    public record Item(String id, String name, int sortOrder, long questionCount) {
    }
}
