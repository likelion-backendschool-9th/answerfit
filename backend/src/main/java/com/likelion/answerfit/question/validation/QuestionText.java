package com.likelion.answerfit.question.validation;

import java.util.Locale;

public final class QuestionText {

    // 브라우저 trim()과 /\s/가 사용하는 집합. DB 검색에서도 같은 문자를 제거한다.
    public static final String SEARCH_WHITESPACE = "\t\n\u000B\f\r \u00A0\u1680\u2000\u2001\u2002\u2003\u2004"
            + "\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF";

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

    public static String normalizeSearch(String value) {
        if (value == null) {
            return "";
        }
        String lower = value.toLowerCase(Locale.ROOT);
        StringBuilder normalized = new StringBuilder(lower.length());
        lower.codePoints().filter(codePoint -> !isTrimmed(codePoint)).forEach(normalized::appendCodePoint);
        return normalized.toString();
    }

    private static boolean isTrimmed(int codePoint) {
        return SEARCH_WHITESPACE.indexOf(codePoint) >= 0;
    }
}
