package com.likelion.answerfit.question.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.repository.projection.CategoryQuestionCount;
import com.likelion.answerfit.question.repository.projection.MajorQuestionCount;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    boolean existsByMajorAndName(QuestionMajor major, String name);

    @Query("""
            select new com.likelion.answerfit.question.repository.projection.CategoryQuestionCount(
                category.id, category.major, category.name, category.sortOrder, count(question.id))
            from Category category
            left join Question question on question.category = category
                and question.status = com.likelion.answerfit.question.entity.QuestionStatus.APPROVED
                and question.deletedAt is null
            group by category.id, category.major, category.name, category.sortOrder
            order by category.major, category.sortOrder, category.id
            """)
    List<CategoryQuestionCount> findAllWithPublicQuestionCount();

    // 인성 질문은 category가 null일 수 있어 대분류 건수를 카테고리 건수의 합으로 구하지 않는다.
    @Query("""
            select new com.likelion.answerfit.question.repository.projection.MajorQuestionCount(
                question.major, count(question.id))
            from Question question
            where question.status = com.likelion.answerfit.question.entity.QuestionStatus.APPROVED
                and question.deletedAt is null
            group by question.major
            order by question.major
            """)
    List<MajorQuestionCount> countPublicQuestionsByMajor();
}
