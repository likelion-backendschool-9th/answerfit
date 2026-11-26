package com.likelion.answerfit.question.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.likelion.answerfit.question.service.CategoryService;

@Component
@ConditionalOnProperty(prefix = "answerfit.question", name = "seed-enabled", havingValue = "true", matchIfMissing = true)
public class CategorySeedInitializer implements ApplicationRunner {

    private final CategoryService categoryService;

    public CategorySeedInitializer(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @Override
    public void run(ApplicationArguments arguments) {
        categoryService.initializeDefaultCategories();
    }
}
