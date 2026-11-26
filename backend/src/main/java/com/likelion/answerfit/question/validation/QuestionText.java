package com.likelion.answerfit.question.validation;

public final class QuestionText {

    private QuestionText() {
    }

    // 브라우저의 String.trim()과 같은 공백·줄바꿈·BOM만 양 끝에서 제거한다.
    public static String trim(String value) {
        if (value == null) {
            return null;
        }
        int start = 0;
        int end = value.length();
        while (start < end && isTrimmed(value.codePointAt(start))) {
            start += Character.charCount(value.codePointAt(start));
        }
        while (end > start && isTrimmed(value.codePointBefore(end))) {
            end -= Character.charCount(value.codePointBefore(end));
        }
        return value.substring(start, end);
    }

    private static boolean isTrimmed(int codePoint) {
        return (codePoint >= 0x0009 && codePoint <= 0x000D)
                || Character.isSpaceChar(codePoint)
                || codePoint == 0xFEFF;
    }
}
