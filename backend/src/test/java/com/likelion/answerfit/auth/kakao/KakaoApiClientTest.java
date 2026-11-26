package com.likelion.answerfit.auth.kakao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.net.SocketTimeoutException;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;

import com.likelion.answerfit.global.exception.CustomException;
import com.likelion.answerfit.global.exception.ErrorCode;

class KakaoApiClientTest {

    private static final String REDIRECT = "http://localhost:3000/auth/kakao/callback";

    private final RestClient.Builder builder = RestClient.builder();
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    private final KakaoApiClient client = new KakaoApiClient(builder, "rest-key", "secret");

    private void tokenOk() {
        LinkedMultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "authorization_code");
        form.add("client_id", "rest-key");
        form.add("client_secret", "secret");
        form.add("redirect_uri", REDIRECT);
        form.add("code", "code");
        server.expect(requestTo(KakaoApiClient.TOKEN_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().formData(form))
                .andRespond(withSuccess("{\"access_token\":\"kakao-token\",\"token_type\":\"bearer\"}", MediaType.APPLICATION_JSON));
    }

    @Test
    void 인가_코드를_토큰으로_바꾸고_회원_정보를_읽는다() {
        tokenOk();
        server.expect(requestTo(KakaoApiClient.USER_URL))
                .andExpect(header("Authorization", "Bearer kakao-token"))
                .andRespond(withSuccess("""
                        {"id":3141592653,"connected_at":"2026-11-26T00:00:00Z",
                         "kakao_account":{"email":"jiwoo@kakao.com","is_email_valid":true,"is_email_verified":true,
                         "profile":{"nickname":"지우"}}}
                        """, MediaType.APPLICATION_JSON));

        assertThat(client.fetchUser("code", REDIRECT)).isEqualTo(new KakaoUser("3141592653", "jiwoo@kakao.com", true, "지우"));
        server.verify();
    }

    @Test
    void 이메일과_닉네임이_없어도_읽는다() {
        tokenOk();
        server.expect(requestTo(KakaoApiClient.USER_URL))
                .andRespond(withSuccess("{\"id\":1,\"kakao_account\":{}}", MediaType.APPLICATION_JSON));

        assertThat(client.fetchUser("code", REDIRECT)).isEqualTo(new KakaoUser("1", null, false, null));
    }

    @Test
    void 카카오가_인가_코드를_거절하면_KAKAO_AUTH_FAILED() {
        server.expect(requestTo(KakaoApiClient.TOKEN_URL))
                .andRespond(withBadRequest().body("{\"error\":\"invalid_grant\",\"error_code\":\"KOE320\"}").contentType(MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.fetchUser("code", REDIRECT))
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode()).isEqualTo(ErrorCode.KAKAO_AUTH_FAILED));
    }

    @Test
    void 카카오_5xx나_연결_실패는_KAKAO_UNAVAILABLE() {
        server.expect(requestTo(KakaoApiClient.TOKEN_URL)).andRespond(withServerError());
        assertThatThrownBy(() -> client.fetchUser("code", REDIRECT))
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode()).isEqualTo(ErrorCode.KAKAO_UNAVAILABLE));

        server.reset();
        tokenOk();
        server.expect(requestTo(KakaoApiClient.USER_URL)).andRespond(withException(new SocketTimeoutException("Read timed out")));
        assertThatThrownBy(() -> client.fetchUser("code", REDIRECT))
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode()).isEqualTo(ErrorCode.KAKAO_UNAVAILABLE));
    }

    @Test
    void 키가_없으면_카카오를_부르지_않고_KAKAO_NOT_CONFIGURED() {
        KakaoApiClient unconfigured = new KakaoApiClient(builder, "", "");

        assertThatThrownBy(() -> unconfigured.fetchUser("code", REDIRECT))
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode()).isEqualTo(ErrorCode.KAKAO_NOT_CONFIGURED));
        server.verify();
    }
}
