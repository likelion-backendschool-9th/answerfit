package com.likelion.answerfit.global.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import com.likelion.answerfit.global.common.ApiResponse;

import java.util.HashMap;
import java.util.Map;

// 404·405는 컨트롤러가 정해지기 전에 나므로 annotations 필터를 걸면 이 핸들러에 오지 않는다.
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(CustomException.class)
    public ResponseEntity<ApiResponse<Void>> handleCustomException(CustomException exception, HttpServletRequest servletRequest) {

        String type = servletRequest.getRequestURL().toString();
        ErrorCode errorCode = exception.getErrorCode();

        ErrorResponse errorResponse = new ErrorResponse(type, errorCode);

        return new ResponseEntity<>(ApiResponse.fail(errorResponse), errorCode.getHttpStatus());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGlobalException(Exception exception, HttpServletRequest servletRequest) {
        exception.printStackTrace();

        String type = servletRequest.getRequestURI().toString();
        ErrorResponse errorResponse = new ErrorResponse(type, ErrorCode.SERVER_ERROR);

        return new ResponseEntity<>(ApiResponse.fail(errorResponse), HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException notValidException,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request
    ){
        String url = ((ServletWebRequest) request).getRequest().getRequestURL().toString();

        Map<String, String> errors = new HashMap<>();
        notValidException.getBindingResult().getFieldErrors().forEach(
                error -> errors.put(error.getField(), error.getDefaultMessage()));

        ErrorResponse errorResponse = new ErrorResponse(url, ErrorCode.INVALID_INPUT, errors);

        return new ResponseEntity<>(ApiResponse.fail(errorResponse), ErrorCode.INVALID_INPUT.getHttpStatus());
    }

    // 매핑된 API가 없는 경로. 정적 리소스 핸들러가 있으면 NoResourceFoundException, 없으면 NoHandlerFoundException이 난다.
    @Override
    protected ResponseEntity<Object> handleNoResourceFoundException(
            NoResourceFoundException exception,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request
    ){
        return failResponse(ErrorCode.API_NOT_FOUND, headers, request);
    }

    @Override
    protected ResponseEntity<Object> handleNoHandlerFoundException(
            NoHandlerFoundException exception,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request
    ){
        return failResponse(ErrorCode.API_NOT_FOUND, headers, request);
    }

    // headers에 허용 메서드(Allow)가 담겨 오므로 그대로 넘긴다.
    @Override
    protected ResponseEntity<Object> handleHttpRequestMethodNotSupported(
            HttpRequestMethodNotSupportedException exception,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request
    ){
        return failResponse(ErrorCode.METHOD_NOT_ALLOWED, headers, request);
    }

    private ResponseEntity<Object> failResponse(ErrorCode errorCode, HttpHeaders headers, WebRequest request) {
        String url = ((ServletWebRequest) request).getRequest().getRequestURL().toString();
        ErrorResponse errorResponse = new ErrorResponse(url, errorCode);

        return new ResponseEntity<>(ApiResponse.fail(errorResponse), headers, errorCode.getHttpStatus());
    }
}