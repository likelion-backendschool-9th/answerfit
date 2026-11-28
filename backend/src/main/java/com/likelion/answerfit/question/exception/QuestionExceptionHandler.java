package com.likelion.answerfit.question.exception;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

import org.hibernate.exception.ConstraintViolationException;
import org.jspecify.annotations.Nullable;
import org.springframework.context.MessageSourceResolvable;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.Errors;
import org.springframework.validation.FieldError;
import org.springframework.validation.method.ParameterErrors;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice(basePackages = "com.likelion.answerfit.question")
@Order(Ordered.HIGHEST_PRECEDENCE)
public class QuestionExceptionHandler extends ResponseEntityExceptionHandler {

    // Hibernate가 전달하는 제약명만 검사한다. H2의 생성 인덱스 접미사도 허용한다.
    private static final Pattern REPORT_UNIQUE_CONSTRAINT = Pattern.compile(
            "^(?:[a-z0-9_]+\\.)?uk_question_reports_question_reporter(?:_index_[a-z0-9]+)?(?:\\s|$)");

    @ExceptionHandler(QuestionException.class)
    public ResponseEntity<QuestionErrorResponse> handleQuestionException(QuestionException exception) {
        QuestionErrorCode code = exception.getErrorCode();
        return ResponseEntity.status(code.getStatus()).body(QuestionErrorResponse.from(code));
    }

    @ExceptionHandler(PessimisticLockingFailureException.class)
    public ResponseEntity<QuestionErrorResponse> handleConcurrentChange(PessimisticLockingFailureException exception) {
        QuestionErrorCode code = QuestionErrorCode.QUESTION_STATE_CHANGED;
        return ResponseEntity.status(code.getStatus()).body(QuestionErrorResponse.from(code));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<QuestionErrorResponse> handleDataIntegrityViolation(DataIntegrityViolationException exception) {
        QuestionErrorCode code = QuestionErrorCode.INTERNAL_ERROR;
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException violation && violation.getConstraintName() != null
                    && REPORT_UNIQUE_CONSTRAINT.matcher(violation.getConstraintName()
                            .replace("\"", "").toLowerCase(Locale.ROOT)).find()) {
                code = QuestionErrorCode.ALREADY_REPORTED;
                break;
            }
        }
        return ResponseEntity.status(code.getStatus()).body(QuestionErrorResponse.from(code));
    }

    @Override
    protected @Nullable ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException exception, HttpHeaders headers, HttpStatusCode status,
            WebRequest request) {
        QuestionErrorResponse body = QuestionErrorResponse.from(
                QuestionErrorCode.INVALID_REQUEST, fieldErrors(exception.getBindingResult()));
        return handleExceptionInternal(exception, body, headers, status, request);
    }

    @Override
    protected @Nullable ResponseEntity<Object> handleHandlerMethodValidationException(
            HandlerMethodValidationException exception, HttpHeaders headers, HttpStatusCode status,
            WebRequest request) {
        if (exception.isForReturnValue()) {
            return handleExceptionInternal(exception, QuestionErrorResponse.from(QuestionErrorCode.INTERNAL_ERROR),
                    headers, status, request);
        }

        List<QuestionErrorResponse.FieldError> errors = new ArrayList<>();
        for (var result : exception.getParameterValidationResults()) {
            if (result instanceof ParameterErrors parameterErrors) {
                errors.addAll(fieldErrors(parameterErrors));
            } else {
                String name = result.getMethodParameter().getParameterName();
                String field = name == null ? "arg" + result.getMethodParameter().getParameterIndex() : name;
                for (var error : result.getResolvableErrors()) {
                    errors.add(new QuestionErrorResponse.FieldError(field, validationMessage(error)));
                }
            }
        }
        return handleExceptionInternal(exception,
                QuestionErrorResponse.from(QuestionErrorCode.INVALID_REQUEST, errors), headers, status, request);
    }

    @Override
    protected ResponseEntity<Object> createResponseEntity(
            @Nullable Object body, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        // Spring의 기본 ProblemDetail에는 거절된 값이나 내부 변환 정보가 포함될 수 있다.
        Object response = body instanceof QuestionErrorResponse ? body : QuestionErrorResponse.from(errorCode(status));
        return new ResponseEntity<>(response, headers, status);
    }

    private static List<QuestionErrorResponse.FieldError> fieldErrors(Errors errors) {
        return errors.getFieldErrors().stream()
                .map(error -> new QuestionErrorResponse.FieldError(error.getField(), validationMessage(error)))
                .toList();
    }

    private static String validationMessage(MessageSourceResolvable error) {
        if (error instanceof FieldError fieldError && fieldError.isBindingFailure()) {
            return "입력 형식이 올바르지 않습니다.";
        }
        String message = error.getDefaultMessage();
        return message == null ? QuestionErrorCode.INVALID_REQUEST.getMessage() : message;
    }

    private static QuestionErrorCode errorCode(HttpStatusCode status) {
        if (status.is5xxServerError()) {
            return QuestionErrorCode.INTERNAL_ERROR;
        }
        return switch (status.value()) {
            case 401 -> QuestionErrorCode.UNAUTHENTICATED;
            case 403 -> QuestionErrorCode.ACCESS_DENIED;
            case 404 -> QuestionErrorCode.QUESTION_NOT_FOUND;
            case 409 -> QuestionErrorCode.QUESTION_STATE_CHANGED;
            default -> QuestionErrorCode.INVALID_REQUEST;
        };
    }
}
