package com.likelion.answerfit.question.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.likelion.answerfit.question.entity.Question;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.repository.projection.QuestionInteractionCount;
import com.likelion.answerfit.question.repository.projection.QuestionNeighbor;

public interface QuestionRepository extends JpaRepository<Question, Long>, QuestionSearchRepository {

    @Query("""
            select question
            from Question question
            left join fetch question.category
            where question.id = :questionId and question.deletedAt is null
            """)
    Optional<Question> findDetailById(@Param("questionId") Long questionId);

    @Query("""
            select new com.likelion.answerfit.question.repository.projection.QuestionInteractionCount(
                (select count(reaction) from QuestionLike reaction where reaction.question = question),
                (select count(reaction) from QuestionLike reaction
                    where reaction.question = question and reaction.id.userId = :userId),
                (select count(report) from QuestionReport report
                    where report.question = question and report.reporterId = :userId))
            from Question question
            where question.id = :questionId and question.deletedAt is null
            """)
    Optional<QuestionInteractionCount> findInteractions(@Param("questionId") Long questionId,
                                                       @Param("userId") Long userId);

    @Query("""
            select keyword.keyword
            from QuestionKeyword keyword
            join keyword.question question
            where question.id = :questionId and question.deletedAt is null
            order by keyword.sortOrder, keyword.id
            """)
    List<String> findKeywords(@Param("questionId") Long questionId);

    @Query("""
            select moderation.reason
            from QuestionModeration moderation
            join moderation.question question
            where question.id = :questionId and question.deletedAt is null
                and moderation.moderationType = com.likelion.answerfit.question.entity.ModerationType.REJECT
            order by moderation.createdAt desc, moderation.id desc
            """)
    List<String> findRejectionReasons(@Param("questionId") Long questionId, Pageable pageable);

    @Query("""
            select new com.likelion.answerfit.question.repository.projection.QuestionNeighbor(question.id, question.content)
            from Question question
            left join question.category category
            where question.major = :major
                and ((:categoryId is null and category.id is null) or category.id = :categoryId)
                and question.status = com.likelion.answerfit.question.entity.QuestionStatus.APPROVED
                and question.deletedAt is null and question.id <> :questionId
                and (question.createdAt > :createdAt or (question.createdAt = :createdAt and question.id > :questionId))
            order by question.createdAt, question.id
            """)
    List<QuestionNeighbor> findPrevious(@Param("major") QuestionMajor major, @Param("categoryId") Long categoryId,
                                        @Param("createdAt") Instant createdAt, @Param("questionId") Long questionId,
                                        Pageable pageable);

    @Query("""
            select new com.likelion.answerfit.question.repository.projection.QuestionNeighbor(question.id, question.content)
            from Question question
            left join question.category category
            where question.major = :major
                and ((:categoryId is null and category.id is null) or category.id = :categoryId)
                and question.status = com.likelion.answerfit.question.entity.QuestionStatus.APPROVED
                and question.deletedAt is null and question.id <> :questionId
                and (question.createdAt < :createdAt or (question.createdAt = :createdAt and question.id < :questionId))
            order by question.createdAt desc, question.id desc
            """)
    List<QuestionNeighbor> findNext(@Param("major") QuestionMajor major, @Param("categoryId") Long categoryId,
                                    @Param("createdAt") Instant createdAt, @Param("questionId") Long questionId,
                                    Pageable pageable);
}
