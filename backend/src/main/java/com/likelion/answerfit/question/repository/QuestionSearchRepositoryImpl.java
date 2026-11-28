package com.likelion.answerfit.question.repository;

import java.util.ArrayList;
import java.util.List;

import org.springframework.transaction.annotation.Transactional;

import com.likelion.answerfit.question.dto.QuestionSort;
import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.Question;
import com.likelion.answerfit.question.entity.QuestionLike;
import com.likelion.answerfit.question.entity.QuestionReport;
import com.likelion.answerfit.question.entity.QuestionStatus;
import com.likelion.answerfit.question.exception.QuestionErrorCode;
import com.likelion.answerfit.question.exception.QuestionException;
import com.likelion.answerfit.question.repository.projection.QuestionListRow;
import com.likelion.answerfit.question.repository.projection.QuestionSearchResult;
import com.likelion.answerfit.question.validation.QuestionInputLimits;
import com.likelion.answerfit.question.validation.QuestionText;

import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CommonAbstractCriteria;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;

@Transactional(readOnly = true)
public class QuestionSearchRepositoryImpl implements QuestionSearchRepository {

    private final EntityManager entityManager;

    public QuestionSearchRepositoryImpl(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Override
    public QuestionSearchResult search(QuestionSearchCondition condition, int page, int pageSize) {
        if (page < 1 || pageSize < 1 || pageSize > QuestionInputLimits.PAGE_SIZE_MAX) {
            throw new QuestionException(QuestionErrorCode.INVALID_REQUEST);
        }

        CriteriaBuilder builder = entityManager.getCriteriaBuilder();
        CriteriaQuery<Long> countQuery = builder.createQuery(Long.class);
        Root<Question> countRoot = countQuery.from(Question.class);
        countQuery.select(builder.count(countRoot))
                .where(predicates(builder, countQuery, countRoot, condition));
        long totalCount = bindKeyword(entityManager.createQuery(countQuery), condition).getSingleResult();
        long totalPages = totalCount == 0 ? 1 : (totalCount - 1) / pageSize + 1;
        int currentPage = (int) Math.min(page, totalPages);

        if (totalCount == 0) {
            return new QuestionSearchResult(List.of(), 0, 1, pageSize, 1);
        }

        long offset = (long) (currentPage - 1) * pageSize;
        if (offset > Integer.MAX_VALUE) {
            throw new QuestionException(QuestionErrorCode.INVALID_REQUEST);
        }

        CriteriaQuery<QuestionListRow> itemsQuery = builder.createQuery(QuestionListRow.class);
        Root<Question> question = itemsQuery.from(Question.class);
        Join<Question, Category> category = question.join("category", JoinType.LEFT);
        Expression<Long> likeCount = likeCount(builder, itemsQuery, question);
        itemsQuery.select(builder.construct(QuestionListRow.class,
                question.get("id"), question.get("major"), category.get("id"), category.get("name"),
                question.get("content"), question.get("status"), question.get("source"), question.get("authorId"),
                likeCount, builder.exists(likedByMember(builder, itemsQuery, question, condition.userId())),
                builder.exists(reportedByMember(builder, itemsQuery, question, condition.userId()))))
                .where(predicates(builder, itemsQuery, question, condition));

        if (condition.sort() == QuestionSort.LIKES) {
            itemsQuery.orderBy(builder.desc(likeCount), builder.desc(question.get("createdAt")),
                    builder.desc(question.get("id")));
        } else {
            itemsQuery.orderBy(builder.desc(question.get("createdAt")), builder.desc(question.get("id")));
        }

        List<QuestionListRow> items = bindKeyword(entityManager.createQuery(itemsQuery), condition)
                .setFirstResult((int) offset)
                .setMaxResults(pageSize)
                .getResultList();
        return new QuestionSearchResult(items, totalCount, currentPage, pageSize, totalPages);
    }

    private Predicate[] predicates(CriteriaBuilder builder, CommonAbstractCriteria query, Root<Question> question,
                                   QuestionSearchCondition condition) {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(builder.equal(question.get("status"), QuestionStatus.APPROVED));
        predicates.add(builder.isNull(question.get("deletedAt")));
        predicates.add(builder.equal(question.get("major"), condition.major()));
        if (condition.categoryId() != null) {
            predicates.add(builder.equal(question.get("category").get("id"), condition.categoryId()));
        }
        if (!condition.keyword().isEmpty()) {
            Expression<String> normalizedContent = builder.lower(question.get("content"));
            for (int index = 0; index < QuestionText.SEARCH_WHITESPACE.length(); index++) {
                normalizedContent = builder.function("replace", String.class, normalizedContent,
                        builder.literal(String.valueOf(QuestionText.SEARCH_WHITESPACE.charAt(index))),
                        builder.literal(""));
            }
            predicates.add(builder.like(normalizedContent, builder.parameter(String.class, "keyword"), '!'));
        }
        if (condition.likedOnly()) {
            predicates.add(builder.exists(likedByMember(builder, query, question, condition.userId())));
        }
        return predicates.toArray(Predicate[]::new);
    }

    private Subquery<Long> likeCount(CriteriaBuilder builder, CommonAbstractCriteria query, Root<Question> question) {
        Subquery<Long> count = query.subquery(Long.class);
        Root<QuestionLike> like = count.from(QuestionLike.class);
        return count.select(builder.count(like)).where(builder.equal(like.get("question"), question));
    }

    private Subquery<Integer> likedByMember(CriteriaBuilder builder, CommonAbstractCriteria query,
                                          Root<Question> question, long userId) {
        Subquery<Integer> liked = query.subquery(Integer.class);
        Root<QuestionLike> like = liked.from(QuestionLike.class);
        return liked.select(builder.literal(1)).where(builder.equal(like.get("question"), question),
                builder.equal(like.get("id").get("userId"), userId));
    }

    private Subquery<Integer> reportedByMember(CriteriaBuilder builder, CommonAbstractCriteria query,
                                             Root<Question> question, long userId) {
        Subquery<Integer> reported = query.subquery(Integer.class);
        Root<QuestionReport> report = reported.from(QuestionReport.class);
        return reported.select(builder.literal(1)).where(builder.equal(report.get("question"), question),
                builder.equal(report.get("reporterId"), userId));
    }

    private <T> TypedQuery<T> bindKeyword(TypedQuery<T> query, QuestionSearchCondition condition) {
        if (!condition.keyword().isEmpty()) {
            String escaped = condition.keyword().replace("!", "!!").replace("%", "!%").replace("_", "!_");
            query.setParameter("keyword", "%" + escaped + "%");
        }
        return query;
    }
}
