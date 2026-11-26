package com.likelion.answerfit.question.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class CodePointLengthValidator implements ConstraintValidator<CodePointLength, String> {

    private int min;
    private int max;

    @Override
    public void initialize(CodePointLength constraint) {
        min = constraint.min();
        max = constraint.max();
        if (min < 0 || max < min) {
            throw new IllegalArgumentException("올바르지 않은 글자 수 범위입니다.");
        }
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) {
            return true;
        }
        int length = value.codePointCount(0, value.length());
        return length >= min && length <= max;
    }
}
