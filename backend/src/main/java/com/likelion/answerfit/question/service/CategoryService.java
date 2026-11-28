package com.likelion.answerfit.question.service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.likelion.answerfit.question.dto.response.CategoryResponse;
import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.repository.CategoryRepository;

@Service
@Transactional(readOnly = true)
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public CategoryResponse getCategories() {
        Map<QuestionMajor, List<CategoryResponse.Item>> categories = new EnumMap<>(QuestionMajor.class);
        for (var category : categoryRepository.findAllWithPublicQuestionCount()) {
            categories.computeIfAbsent(category.major(), ignored -> new ArrayList<>())
                    .add(new CategoryResponse.Item(category.id().toString(), category.name(),
                            category.sortOrder(), category.questionCount()));
        }

        // 중분류가 없는 인성 질문도 대분류 전체 건수에는 포함한다.
        Map<QuestionMajor, Long> counts = new EnumMap<>(QuestionMajor.class);
        for (var count : categoryRepository.countPublicQuestionsByMajor()) {
            counts.put(count.major(), count.questionCount());
        }

        return new CategoryResponse(Arrays.stream(QuestionMajor.values())
                .map(major -> new CategoryResponse.MajorGroup(major, majorName(major),
                        counts.getOrDefault(major, 0L), categories.getOrDefault(major, List.of())))
                .toList());
    }

    @Transactional
    public void initializeDefaultCategories() {
        initialize(QuestionMajor.CS, List.of("운영체제", "네트워크", "데이터베이스", "자료구조", "알고리즘", "웹"));
        initialize(QuestionMajor.PERSONALITY, List.of("협업", "성장", "지원 동기", "문제 해결"));
    }

    private void initialize(QuestionMajor major, List<String> names) {
        for (int i = 0; i < names.size(); i++) {
            String name = names.get(i);
            if (!categoryRepository.existsByMajorAndName(major, name)) {
                categoryRepository.save(Category.builder()
                        .major(major)
                        .name(name)
                        .sortOrder((i + 1) * 10)
                        .build());
            }
        }
    }

    private static String majorName(QuestionMajor major) {
        return switch (major) {
            case CS -> "CS";
            case PERSONALITY -> "인성 면접";
        };
    }
}
