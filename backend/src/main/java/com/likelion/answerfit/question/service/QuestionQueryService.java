package com.likelion.answerfit.question.service;

import java.util.EnumMap;
import java.util.Map;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.likelion.answerfit.question.auth.QuestionMember;
import com.likelion.answerfit.question.dto.request.QuestionSearchRequest;
import com.likelion.answerfit.question.dto.response.QuestionListResponse;
import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.entity.QuestionSource;
import com.likelion.answerfit.question.exception.QuestionErrorCode;
import com.likelion.answerfit.question.exception.QuestionException;
import com.likelion.answerfit.question.repository.CategoryRepository;
import com.likelion.answerfit.question.repository.QuestionRepository;
import com.likelion.answerfit.question.repository.QuestionSearchCondition;
import com.likelion.answerfit.question.repository.projection.QuestionListRow;
import com.likelion.answerfit.question.validation.QuestionText;

@Service
@Transactional(readOnly = true)
public class QuestionQueryService {

    private final QuestionRepository questionRepository;
    private final CategoryRepository categoryRepository;

    public QuestionQueryService(QuestionRepository questionRepository, CategoryRepository categoryRepository) {
        this.questionRepository = questionRepository;
        this.categoryRepository = categoryRepository;
    }

    public QuestionListResponse getQuestions(QuestionSearchRequest request, QuestionMember member) {
        if (request.categoryId() != null) {
            Category category = categoryRepository.findById(request.categoryId())
                    .orElseThrow(() -> new QuestionException(QuestionErrorCode.INVALID_CATEGORY));
            if (category.getMajor() != request.major()) {
                throw new QuestionException(QuestionErrorCode.INVALID_CATEGORY);
            }
        }

        QuestionSearchCondition condition = new QuestionSearchCondition(
                request.major(), request.categoryId(), QuestionText.normalizeSearch(request.keyword()),
                request.likedOnly(), request.sort(), member.userId());
        var result = questionRepository.search(condition, request.page(), request.pageSize());

        Map<QuestionMajor, Long> majorCounts = new EnumMap<>(QuestionMajor.class);
        for (QuestionMajor major : QuestionMajor.values()) {
            majorCounts.put(major, 0L);
        }
        for (var count : categoryRepository.countPublicQuestionsByMajor()) {
            majorCounts.put(count.major(), count.questionCount());
        }

        return new QuestionListResponse(result.items().stream().map(row -> toItem(row, member)).toList(),
                result.totalCount(), result.page(), result.pageSize(), result.totalPages(), majorCounts);
    }

    private static QuestionListResponse.Item toItem(QuestionListRow row, QuestionMember member) {
        QuestionListResponse.CategoryItem category = row.categoryId() == null ? null
                : new QuestionListResponse.CategoryItem(row.categoryId().toString(), row.categoryName());
        boolean mine = row.source() == QuestionSource.USER && Objects.equals(row.authorId(), member.userId());
        return new QuestionListResponse.Item(row.id().toString(), row.major(), category, row.content(),
                row.status(), row.likeCount(), row.liked(), mine, row.reported());
    }
}
