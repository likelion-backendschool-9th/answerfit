package com.likelion.answerfit.question.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.likelion.answerfit.question.auth.QuestionMember;
import com.likelion.answerfit.question.dto.response.QuestionLikeResponse;
import com.likelion.answerfit.question.entity.Question;
import com.likelion.answerfit.question.entity.QuestionLike;
import com.likelion.answerfit.question.entity.QuestionLikeId;
import com.likelion.answerfit.question.exception.QuestionErrorCode;
import com.likelion.answerfit.question.exception.QuestionException;
import com.likelion.answerfit.question.policy.QuestionPolicy;
import com.likelion.answerfit.question.repository.QuestionLikeRepository;
import com.likelion.answerfit.question.repository.QuestionRepository;

@Service
@Transactional
public class QuestionLikeService {

    private final QuestionRepository questionRepository;
    private final QuestionLikeRepository questionLikeRepository;

    public QuestionLikeService(QuestionRepository questionRepository, QuestionLikeRepository questionLikeRepository) {
        this.questionRepository = questionRepository;
        this.questionLikeRepository = questionLikeRepository;
    }

    public QuestionLikeResponse likeQuestion(Long questionId, QuestionMember member) {
        Question question = requirePublicQuestionForUpdate(questionId);
        QuestionLikeId id = new QuestionLikeId(member.userId(), questionId);
        if (!questionLikeRepository.existsById(id)) {
            questionLikeRepository.saveAndFlush(QuestionLike.create(member.userId(), question));
        }
        return new QuestionLikeResponse(questionLikeRepository.countByIdQuestionId(questionId), true);
    }

    public QuestionLikeResponse unlikeQuestion(Long questionId, QuestionMember member) {
        requirePublicQuestionForUpdate(questionId);
        questionLikeRepository.deleteById(new QuestionLikeId(member.userId(), questionId));
        questionLikeRepository.flush();
        return new QuestionLikeResponse(questionLikeRepository.countByIdQuestionId(questionId), false);
    }

    private Question requirePublicQuestionForUpdate(Long questionId) {
        Question question = questionRepository.findForUpdateById(questionId)
                .orElseThrow(() -> new QuestionException(QuestionErrorCode.QUESTION_NOT_FOUND));
        if (!QuestionPolicy.isPublic(question)) {
            throw new QuestionException(QuestionErrorCode.QUESTION_NOT_FOUND);
        }
        return question;
    }
}
