package com.likelion.answerfit.question.admin.exception;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.context.MessageSourceResolvable;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.OptimisticLockingFailureException;
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
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;

import com.likelion.answerfit.global.common.ApiResponse;
import com.likelion.answerfit.global.exception.CustomException;
import com.likelion.answerfit.global.exception.ErrorCode;
import com.likelion.answerfit.global.exception.ErrorResponse;
import com.likelion.answerfit.global.exception.GlobalExceptionHandler;

import jakarta.servlet.http.HttpServletRequest;

/** 관리자 업무 오류와 MVC 오류는 공통 envelope로 반환한다. */
@RestControllerAdvice(basePackages = "com.likelion.answerfit.question.admin")
@Order(Ordered.HIGHEST_PRECEDENCE)
public class AdminQuestionExceptionHandler extends GlobalExceptionHandler {

    @ExceptionHandler(PessimisticLockingFailureException.class)
    public ResponseEntity<ApiResponse<Void>> handleConcurrentChange(
            PessimisticLockingFailureException exception, HttpServletRequest request) {
        return handleCustomException(new CustomException(ErrorCode.ADMIN_QUESTION_STATE_CHANGED), request);
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ApiResponse<Void>> handleRevisionConflict(
            OptimisticLockingFailureException exception, HttpServletRequest request) {
        return handleCustomException(new CustomException(ErrorCode.ADMIN_REVISION_CONFLICT), request);
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException exception, HttpHeaders headers, HttpStatusCode status,
            WebRequest request) {
        return validationResponse(fieldErrors(exception.getBindingResult()), headers, request);
    }

    @Override
    protected ResponseEntity<Object> handleHandlerMethodValidationException(
            HandlerMethodValidationException exception, HttpHeaders headers, HttpStatusCode status,
            WebRequest request) {
        if (exception.isForReturnValue()) {
            return errorResponse(ErrorCode.SERVER_ERROR, null, headers, request);
        }
        Map<String, String> errors = new LinkedHashMap<>();
        for (var result : exception.getParameterValidationResults()) {
            if (result instanceof ParameterErrors parameterErrors) {
                errors.putAll(fieldErrors(parameterErrors));
            } else {
                String name = result.getMethodParameter().getParameterName();
                String field = name == null ? "arg" + result.getMethodParameter().getParameterIndex() : name;
                for (var error : result.getResolvableErrors()) {
                    errors.putIfAbsent(field, validationMessage(error));
                }
            }
        }
        return validationResponse(errors, headers, request);
    }

    private ResponseEntity<Object> validationResponse(
            Map<String, String> errors, HttpHeaders headers, WebRequest request) {
        return errorResponse(ErrorCode.INVALID_INPUT, errors, headers, request);
    }

    private ResponseEntity<Object> errorResponse(
            ErrorCode code, Map<String, String> errors, HttpHeaders headers, WebRequest request) {
        String path = ((ServletWebRequest) request).getRequest().getRequestURI();
        return new ResponseEntity<>(ApiResponse.fail(new ErrorResponse(path, code, errors)), headers, code.getHttpStatus());
    }

    private static Map<String, String> fieldErrors(Errors errors) {
        Map<String, String> messages = new LinkedHashMap<>();
        for (FieldError error : errors.getFieldErrors()) {
            messages.putIfAbsent(error.getField(), validationMessage(error));
        }
        return messages;
    }

    private static String validationMessage(MessageSourceResolvable error) {
        if (error instanceof FieldError fieldError && fieldError.isBindingFailure()) {
            return "입력 형식이 올바르지 않습니다.";
        }
        return error.getDefaultMessage() == null ? ErrorCode.INVALID_INPUT.getMessage() : error.getDefaultMessage();
    }
}
