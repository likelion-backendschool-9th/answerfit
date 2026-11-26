package com.likelion.answerfit.global.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import com.likelion.answerfit.global.common.ApiResponse;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice(annotations = RestController.class)
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
}