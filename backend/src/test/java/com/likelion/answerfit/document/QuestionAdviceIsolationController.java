package com.likelion.answerfit.document;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.likelion.answerfit.question.exception.QuestionErrorCode;
import com.likelion.answerfit.question.exception.QuestionException;

/** 문제은행 오류 처리가 다른 도메인에 적용되지 않는지 확인하는 테스트 전용 컨트롤러. */
@RestController
public class QuestionAdviceIsolationController {

    @GetMapping("/test/other/validation")
    public int validation(@RequestParam("page") int page) {
        return page;
    }

    @GetMapping("/test/other/errors")
    public void error() {
        throw new QuestionException(QuestionErrorCode.INVALID_CATEGORY);
    }
}
