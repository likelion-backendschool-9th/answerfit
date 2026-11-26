package com.likelion.answerfit.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.support.TransactionOperations;
import org.springframework.test.util.ReflectionTestUtils;

import com.likelion.answerfit.auth.jwt.TokenService;
import com.likelion.answerfit.auth.kakao.KakaoClient;
import com.likelion.answerfit.auth.kakao.KakaoUser;
import com.likelion.answerfit.global.exception.CustomException;
import com.likelion.answerfit.global.exception.ErrorCode;
import com.likelion.answerfit.user.entity.SocialProvider;
import com.likelion.answerfit.user.entity.User;
import com.likelion.answerfit.user.entity.UserSocialAccount;
import com.likelion.answerfit.user.repository.UserRepository;
import com.likelion.answerfit.user.repository.UserSocialAccountRepository;

class SocialLoginServiceImplTest {

    private final KakaoClient kakaoClient = mock(KakaoClient.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final UserSocialAccountRepository socialAccountRepository = mock(UserSocialAccountRepository.class);
    private final TokenService tokenService = mock(TokenService.class);
    private final SocialLoginService service =
            new SocialLoginServiceImpl(kakaoClient, userRepository, socialAccountRepository, tokenService,
                    TransactionOperations.withoutTransaction(), () -> 4821);

    @BeforeEach
    void setUp() {
        when(userRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(tokenService.issue(any())).thenReturn("token");
    }

    private void kakaoReturns(KakaoUser user) {
        when(kakaoClient.fetchUser("code", "http://localhost:3000/auth/kakao/callback")).thenReturn(user);
    }

    private String login() {
        return service.loginWithKakao("code", "http://localhost:3000/auth/kakao/callback");
    }

    private static ErrorCode codeOf(Throwable e) {
        return ((CustomException) e).getErrorCode();
    }

    private UserSocialAccount linked(User user, long id) {
        ReflectionTestUtils.setField(user, "id", id);
        return UserSocialAccount.builder().user(user).provider(SocialProvider.KAKAO).providerUserId("777").build();
    }

    @Test
    void 처음_온_카카오_계정은_회원과_소셜_계정을_만들고_토큰을_준다() {
        kakaoReturns(new KakaoUser("777", "jiwoo@kakao.com", true, "지우"));

        assertThat(login()).isEqualTo("token");

        ArgumentCaptor<User> user = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(user.capture());
        assertThat(user.getValue().getEmail()).isEqualTo("jiwoo@kakao.com");
        assertThat(user.getValue().getNickname()).isEqualTo("지우");
        assertThat(user.getValue().getPasswordHash()).isNull();
        ArgumentCaptor<UserSocialAccount> account = ArgumentCaptor.forClass(UserSocialAccount.class);
        verify(socialAccountRepository).save(account.capture());
        assertThat(account.getValue().getProvider()).isEqualTo(SocialProvider.KAKAO);
        assertThat(account.getValue().getProviderUserId()).isEqualTo("777");
        assertThat(account.getValue().getUser()).isSameAs(user.getValue());
    }

    @Test
    void 연결된_카카오_계정은_그_회원으로_로그인한다() {
        User user = User.createSocial("jiwoo@kakao.com", "지우");
        kakaoReturns(new KakaoUser("777", "jiwoo@kakao.com", true, "지우"));
        when(socialAccountRepository.findByProviderAndProviderUserId(SocialProvider.KAKAO, "777"))
                .thenReturn(Optional.of(linked(user, 1L)));
        when(userRepository.findActiveById(1L)).thenReturn(Optional.of(user));

        assertThat(login()).isEqualTo("token");

        verify(tokenService).issue(user);
        verify(userRepository, never()).save(any());
    }

    @Test
    void 이용_정지된_회원은_사유와_함께_거절한다() {
        User user = User.createSocial("jiwoo@kakao.com", "지우");
        user.suspend("같은 질문을 반복해서 등록함");
        kakaoReturns(new KakaoUser("777", "jiwoo@kakao.com", true, "지우"));
        when(socialAccountRepository.findByProviderAndProviderUserId(SocialProvider.KAKAO, "777"))
                .thenReturn(Optional.of(linked(user, 1L)));
        when(userRepository.findActiveById(1L)).thenReturn(Optional.of(user));

        assertThatThrownBy(this::login)
                .satisfies(e -> assertThat(codeOf(e)).isEqualTo(ErrorCode.SUSPENDED))
                .hasMessageContaining("같은 질문을 반복해서 등록함");
        verify(tokenService, never()).issue(any());
    }

    @Test
    void 탈퇴한_회원의_카카오_계정은_거절한다() {
        kakaoReturns(new KakaoUser("777", "jiwoo@kakao.com", true, "지우"));
        when(socialAccountRepository.findByProviderAndProviderUserId(SocialProvider.KAKAO, "777"))
                .thenReturn(Optional.of(linked(User.createSocial("jiwoo@kakao.com", "지우"), 1L)));
        when(userRepository.findActiveById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(this::login).satisfies(e -> assertThat(codeOf(e)).isEqualTo(ErrorCode.WITHDRAWN));
    }

    @Test
    void 인증되지_않은_이메일이나_없는_이메일은_가입하지_않는다() {
        kakaoReturns(new KakaoUser("777", "jiwoo@kakao.com", false, "지우"));
        assertThatThrownBy(this::login).satisfies(e -> assertThat(codeOf(e)).isEqualTo(ErrorCode.EMAIL_NOT_VERIFIED));

        kakaoReturns(new KakaoUser("777", null, true, "지우"));
        assertThatThrownBy(this::login).satisfies(e -> assertThat(codeOf(e)).isEqualTo(ErrorCode.EMAIL_NOT_VERIFIED));
        verify(userRepository, never()).save(any());
    }

    @Test
    void 같은_이메일의_회원이_있으면_연결하지_않고_거절한다() {
        kakaoReturns(new KakaoUser("777", "Jiwoo@kakao.com", true, "지우"));
        when(userRepository.existsByEmailIgnoreCase("Jiwoo@kakao.com")).thenReturn(true);

        assertThatThrownBy(this::login).satisfies(e -> assertThat(codeOf(e)).isEqualTo(ErrorCode.EMAIL_ALREADY_REGISTERED));
        verify(socialAccountRepository, never()).save(any());
    }

    @Test
    void 규칙에_맞지_않거나_쓰이는_닉네임은_회원과_숫자로_바꾼다() {
        when(userRepository.existsByNickname("지우")).thenReturn(true);
        for (String nickname : new String[] {"지 우", "지", "열세글자가넘는아주긴닉네임", "지우", null}) {
            kakaoReturns(new KakaoUser("777", "jiwoo@kakao.com", true, nickname));
            login();
        }
        ArgumentCaptor<User> users = ArgumentCaptor.forClass(User.class);
        verify(userRepository, org.mockito.Mockito.times(5)).save(users.capture());
        assertThat(users.getAllValues()).extracting(User::getNickname).containsOnly("회원4821");
    }

    @Test
    void 동시_가입으로_유일_조건에_걸리면_한_번_다시_해서_먼저_만든_회원으로_로그인한다() {
        User created = User.createSocial("jiwoo@kakao.com", "지우");
        kakaoReturns(new KakaoUser("777", "jiwoo@kakao.com", true, "지우"));
        when(socialAccountRepository.findByProviderAndProviderUserId(SocialProvider.KAKAO, "777"))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(linked(created, 1L)));
        when(socialAccountRepository.save(any())).thenThrow(new DataIntegrityViolationException("uk_user_social_accounts_provider_user"));
        when(userRepository.findActiveById(1L)).thenReturn(Optional.of(created));

        assertThat(login()).isEqualTo("token");

        verify(kakaoClient, org.mockito.Mockito.times(1)).fetchUser(anyString(), anyString());
        verify(tokenService).issue(created);
    }

    @Test
    void 다시_해도_유일_조건에_걸리면_예외를_그대로_던진다() {
        kakaoReturns(new KakaoUser("777", "jiwoo@kakao.com", true, "지우"));
        when(socialAccountRepository.save(any())).thenThrow(new DataIntegrityViolationException("uk"));

        assertThatThrownBy(this::login).isInstanceOf(DataIntegrityViolationException.class);
        verify(socialAccountRepository, org.mockito.Mockito.times(2)).save(any());
    }

    @Test
    void 만든_닉네임이_계속_쓰이고_있으면_실패한다() {
        kakaoReturns(new KakaoUser("777", "jiwoo@kakao.com", true, null));
        when(userRepository.existsByNickname(anyString())).thenReturn(true);

        assertThatThrownBy(this::login).isInstanceOf(IllegalStateException.class);
    }
}
