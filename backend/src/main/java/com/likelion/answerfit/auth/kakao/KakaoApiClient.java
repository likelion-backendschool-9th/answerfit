package com.likelion.answerfit.auth.kakao;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import java.time.Duration;

import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.likelion.answerfit.global.exception.CustomException;
import com.likelion.answerfit.global.exception.ErrorCode;

/** https://developers.kakao.com/docs/ko/kakaologin/rest-api */
@Component
public class KakaoApiClient implements KakaoClient {

    static final String TOKEN_URL = "https://kauth.kakao.com/oauth/token";
    static final String USER_URL = "https://kapi.kakao.com/v2/user/me";
    /** 카카오가 응답하지 않아도 요청이 끝없이 기다리지 않게 한다 */
    static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(3);
    static final Duration READ_TIMEOUT = Duration.ofSeconds(5);

    private final RestClient restClient;
    private final String clientId;
    private final String clientSecret;

    @Autowired
    public KakaoApiClient(
            @Value("${answerfit.kakao.client-id:}") String clientId,
            @Value("${answerfit.kakao.client-secret:}") String clientSecret) {
        this(RestClient.builder().requestFactory(requestFactory()), clientId, clientSecret);
    }

    private static SimpleClientHttpRequestFactory requestFactory() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(CONNECT_TIMEOUT);
        factory.setReadTimeout(READ_TIMEOUT);
        return factory;
    }

    KakaoApiClient(RestClient.Builder builder, String clientId, String clientSecret) {
        this.restClient = builder.build();
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    @Override
    public KakaoUser fetchUser(String code, String redirectUri) {
        if (clientId.isBlank() || clientSecret.isBlank()) {
            throw new CustomException(ErrorCode.KAKAO_NOT_CONFIGURED);
        }
        try {
            return exchange(code, redirectUri);
        } catch (RestClientException e) {
            // 카카오 5xx, 연결 실패, 시간 초과. 카카오가 코드를 거절한 4xx는 onStatus에서 KAKAO_AUTH_FAILED가 된다
            throw new CustomException(ErrorCode.KAKAO_UNAVAILABLE);
        }
    }

    private KakaoUser exchange(String code, String redirectUri) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "authorization_code");
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("redirect_uri", redirectUri);
        form.add("code", code);

        TokenBody token = restClient.post().uri(TOKEN_URL)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, (request, response) -> {
                    throw new CustomException(ErrorCode.KAKAO_AUTH_FAILED);
                })
                .body(TokenBody.class);
        if (token == null || token.accessToken() == null) {
            throw new CustomException(ErrorCode.KAKAO_AUTH_FAILED);
        }

        UserBody user = restClient.get().uri(USER_URL)
                .header("Authorization", "Bearer " + token.accessToken())
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, (request, response) -> {
                    throw new CustomException(ErrorCode.KAKAO_AUTH_FAILED);
                })
                .body(UserBody.class);
        if (user == null || user.id() == null) {
            throw new CustomException(ErrorCode.KAKAO_AUTH_FAILED);
        }
        return user.toKakaoUser();
    }

    record TokenBody(@JsonProperty("access_token") String accessToken) {
    }

    record UserBody(Long id, @JsonProperty("kakao_account") Account account) {

        KakaoUser toKakaoUser() {
            if (account == null) {
                return new KakaoUser(String.valueOf(id), null, false, null);
            }
            String nickname = account.profile() == null ? null : account.profile().nickname();
            return new KakaoUser(String.valueOf(id), account.email(), Boolean.TRUE.equals(account.emailVerified()), nickname);
        }
    }

    record Account(
            String email,
            @JsonProperty("is_email_verified") Boolean emailVerified,
            Profile profile) {
    }

    record Profile(String nickname) {
    }
}
