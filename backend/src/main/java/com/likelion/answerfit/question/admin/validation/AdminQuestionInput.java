package com.likelion.answerfit.question.admin.validation;

import java.util.LinkedHashSet;
import java.util.List;

import com.likelion.answerfit.global.exception.CustomException;
import com.likelion.answerfit.global.exception.ErrorCode;
import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.validation.QuestionInputLimits;
import com.likelion.answerfit.question.validation.QuestionText;

/** 관리자 요청의 공통 정규화·입력 규칙. DB 존재 여부와 변경 권한은 유스케이스에서 확인한다. */
public final class AdminQuestionInput {

    public static final int ANSWER_MAX = 2_000;
    public static final int HINT_MAX = 2_000;
    public static final int REASON_MAX = 300;
    public static final int KEYWORD_MAX = 20;
    public static final int KEYWORD_COUNT_MAX = 10;
    public static final int REPORT_SELECTION_MAX = 100;

    private AdminQuestionInput() {
    }

    public static String content(String value) {
        return requiredText(value, QuestionInputLimits.CONTENT_MIN, QuestionInputLimits.CONTENT_MAX,
                "질문은 10~200자로 입력해 주세요.");
    }

    public static String modelAnswer(String value) {
        return requiredText(value, 1, ANSWER_MAX, "모범답안은 1~2,000자로 입력해 주세요.");
    }

    public static String hint(String value) {
        String normalized = QuestionText.trim(value);
        if (normalized == null || normalized.isEmpty()) {
            return null;
        }
        if (length(normalized) > HINT_MAX) {
            throw invalid("힌트는 2,000자 이내로 입력해 주세요.");
        }
        return normalized;
    }

    public static String reason(String value) {
        return requiredText(value, 1, REASON_MAX, "조치 사유는 1~300자로 입력해 주세요.");
    }

    public static List<String> keywords(List<String> values) {
        if (values == null) {
            throw invalid("키워드 목록을 전달해 주세요.");
        }
        var unique = new LinkedHashSet<String>();
        for (String value : values) {
            if (value == null) {
                throw invalid("키워드에 null을 사용할 수 없습니다.");
            }
            String normalized = QuestionText.trim(value);
            if (normalized.isEmpty()) {
                continue;
            }
            if (length(normalized) > KEYWORD_MAX) {
                throw invalid("키워드는 각각 20자 이내로 입력해 주세요.");
            }
            unique.add(normalized);
            if (unique.size() > KEYWORD_COUNT_MAX) {
                throw invalid("키워드는 10개 이내로 입력해 주세요.");
            }
        }
        return List.copyOf(unique);
    }

    public static void requireCategory(QuestionMajor major, Category category) {
        if (major == null) {
            throw invalid("대분류를 전달해 주세요.");
        }
        if ((major == QuestionMajor.CS && category == null)
                || (category != null && category.getMajor() != major)) {
            throw new CustomException(ErrorCode.ADMIN_INVALID_CATEGORY);
        }
    }

    public static List<Long> reportIds(Long anchorId, List<Long> values) {
        if (anchorId == null || anchorId <= 0 || values == null || values.isEmpty()
                || values.size() > REPORT_SELECTION_MAX
                || values.stream().anyMatch(id -> id == null || id <= 0)) {
            throw new CustomException(ErrorCode.ADMIN_INVALID_REPORT_SELECTION);
        }
        List<Long> selected = values.stream().distinct().sorted().toList();
        if (!selected.contains(anchorId)) {
            throw new CustomException(ErrorCode.ADMIN_INVALID_REPORT_SELECTION);
        }
        return selected;
    }

    public static void requireRevision(long currentRevision, Long expectedRevision) {
        if (expectedRevision == null || expectedRevision < 0) {
            throw invalid("조회한 질문의 버전을 전달해 주세요.");
        }
        if (currentRevision != expectedRevision) {
            throw new CustomException(ErrorCode.ADMIN_REVISION_CONFLICT);
        }
    }

    private static String requiredText(String value, int min, int max, String message) {
        String normalized = QuestionText.trim(value);
        if (normalized == null || length(normalized) < min || length(normalized) > max) {
            throw invalid(message);
        }
        return normalized;
    }

    private static int length(String value) {
        return value.codePointCount(0, value.length());
    }

    private static CustomException invalid(String message) {
        return new CustomException(ErrorCode.INVALID_INPUT, message);
    }
}
