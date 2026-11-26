package com.likelion.answerfit.auth.kakao;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.likelion.answerfit.global.error.ApiException;
import com.likelion.answerfit.global.error.ErrorCode;

/** https://developers.kakao.com/docs/ko/kakaologin/rest-api */
@Component
public class KakaoApiClient implements KakaoClient {

    static final String TOKEN_URL = "https://kauth.kakao.com/oauth/token";
    static final String USER_URL = "https://kapi.kakao.com/v2/user/me";

    private final RestClient restClient;
    private final String clientId;
    private final String clientSecret;

    @Autowired
    public KakaoApiClient(
            @Value("${answerfit.kakao.client-id:}") String clientId,
            @Value("${answerfit.kakao.client-secret:}") String clientSecret) {
        this(RestClient.builder(), clientId, clientSecret);
    }

    KakaoApiClient(RestClient.Builder builder, String clientId, String clientSecret) {
        this.restClient = builder.build();
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    @Override
    public KakaoUser fetchUser(String code, String redirectUri) {
        if (clientId.isBlank() || clientSecret.isBlank()) {
            throw new ApiException(ErrorCode.KAKAO_NOT_CONFIGURED);
        }
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
                    throw new ApiException(ErrorCode.KAKAO_AUTH_FAILED);
                })
                .body(TokenBody.class);
        if (token == null || token.accessToken() == null) {
            throw new ApiException(ErrorCode.KAKAO_AUTH_FAILED);
        }

        UserBody user = restClient.get().uri(USER_URL)
                .header("Authorization", "Bearer " + token.accessToken())
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, (request, response) -> {
                    throw new ApiException(ErrorCode.KAKAO_AUTH_FAILED);
                })
                .body(UserBody.class);
        if (user == null || user.id() == null) {
            throw new ApiException(ErrorCode.KAKAO_AUTH_FAILED);
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
