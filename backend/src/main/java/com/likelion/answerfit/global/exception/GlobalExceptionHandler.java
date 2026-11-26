package com.likelion.answerfit.global.exception;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import com.likelion.answerfit.global.common.ApiResponse;

import java.util.HashMap;
import java.util.Map;

// 404·405는 컨트롤러가 정해지기 전에 나므로 annotations 필터를 걸면 이 핸들러에 오지 않는다.
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(CustomException.class)
    public ResponseEntity<ApiResponse<Void>> handleCustomException(CustomException exception, HttpServletRequest request) {
        return failResponse(exception.getErrorCode(), request.getRequestURI());
    }

    // Spring Security가 들어오면 AccessDeniedException·AuthenticationException은 따로 받아야 한다. 여기로 오면 500이 된다.
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGlobalException(Exception exception, HttpServletRequest request) {
        log.error("처리하지 못한 예외: {} {}", request.getMethod(), request.getRequestURI(), exception);
        return failResponse(ErrorCode.SERVER_ERROR, request.getRequestURI());
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException exception,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request
    ) {
        Map<String, String> errors = new HashMap<>();
        exception.getBindingResult().getFieldErrors().forEach(
                error -> errors.put(error.getField(), error.getDefaultMessage()));

        ErrorResponse errorResponse = new ErrorResponse(path(request), ErrorCode.INVALID_INPUT, errors);
        return super.handleExceptionInternal(exception, ApiResponse.fail(errorResponse), headers, ErrorCode.INVALID_INPUT.getHttpStatus(), request);
    }

    // ResponseEntityExceptionHandler가 받는 스프링 MVC 예외(404·405·415, JSON 파싱 실패, 파라미터 누락, ResponseStatusException 등)는 모두 여기를 지난다.
    // headers에 Allow(405)·Accept(415)가 담겨 오므로 그대로 넘긴다.
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception exception,
            Object body,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request
    ) {
        ErrorCode errorCode = switch (status.value()) {
            case 404 -> ErrorCode.API_NOT_FOUND;
            case 405 -> ErrorCode.METHOD_NOT_ALLOWED;
            case 415 -> ErrorCode.UNSUPPORTED_MEDIA_TYPE;
            default -> status.is4xxClientError() ? ErrorCode.INVALID_INPUT : ErrorCode.SERVER_ERROR;
        };
        ErrorResponse errorResponse = new ErrorResponse(path(request), errorCode);
        return super.handleExceptionInternal(exception, ApiResponse.fail(errorResponse), headers, errorCode.getHttpStatus(), request);
    }

    private ResponseEntity<ApiResponse<Void>> failResponse(ErrorCode errorCode, String path) {
        return ResponseEntity.status(errorCode.getHttpStatus())
                .body(ApiResponse.fail(new ErrorResponse(path, errorCode)));
    }

    private String path(WebRequest request) {
        return ((ServletWebRequest) request).getRequest().getRequestURI();
    }
}
