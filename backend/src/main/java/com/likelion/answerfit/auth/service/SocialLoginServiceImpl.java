package com.likelion.answerfit.auth.service;

import java.util.concurrent.ThreadLocalRandom;
import java.util.function.IntSupplier;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionOperations;

import com.likelion.answerfit.auth.jwt.TokenService;
import com.likelion.answerfit.auth.kakao.KakaoClient;
import com.likelion.answerfit.auth.kakao.KakaoUser;
import com.likelion.answerfit.global.error.ApiException;
import com.likelion.answerfit.global.error.ErrorCode;
import com.likelion.answerfit.user.entity.SocialProvider;
import com.likelion.answerfit.user.entity.User;
import com.likelion.answerfit.user.entity.UserSocialAccount;
import com.likelion.answerfit.user.entity.UserStatus;
import com.likelion.answerfit.user.repository.UserRepository;
import com.likelion.answerfit.user.repository.UserSocialAccountRepository;

/** docs/backend/user/kakao-login.md */
@Service
public class SocialLoginServiceImpl implements SocialLoginService {

    /** 프론트 회원가입과 같은 규칙 */
    static final Pattern NICKNAME = Pattern.compile("^[가-힣A-Za-z0-9]{2,12}$");
    private static final int NICKNAME_TRIES = 20;

    private final KakaoClient kakaoClient;
    private final UserRepository userRepository;
    private final UserSocialAccountRepository socialAccountRepository;
    private final TokenService tokenService;
    private final TransactionOperations transaction;
    private final IntSupplier nicknameNumber;

    @Autowired
    public SocialLoginServiceImpl(
            KakaoClient kakaoClient,
            UserRepository userRepository,
            UserSocialAccountRepository socialAccountRepository,
            TokenService tokenService,
            TransactionOperations transaction) {
        // "회원" 뒤 숫자 후보를 넉넉히 둬서 회원이 늘어도 겹칠 일이 드물게 한다
        this(kakaoClient, userRepository, socialAccountRepository, tokenService, transaction,
                () -> ThreadLocalRandom.current().nextInt(1000, 1_000_000));
    }

    SocialLoginServiceImpl(
            KakaoClient kakaoClient,
            UserRepository userRepository,
            UserSocialAccountRepository socialAccountRepository,
            TokenService tokenService,
            TransactionOperations transaction,
            IntSupplier nicknameNumber) {
        this.kakaoClient = kakaoClient;
        this.userRepository = userRepository;
        this.socialAccountRepository = socialAccountRepository;
        this.tokenService = tokenService;
        this.transaction = transaction;
        this.nicknameNumber = nicknameNumber;
    }

    /** 카카오 호출은 DB 커넥션을 잡지 않도록 트랜잭션 밖에서 하고, 회원 찾기·가입만 트랜잭션으로 묶는다. */
    @Override
    public String loginWithKakao(String code, String redirectUri) {
        KakaoUser kakao = kakaoClient.fetchUser(code, redirectUri);
        User user;
        try {
            user = transaction.execute(status -> findOrSignUp(kakao));
        } catch (DataIntegrityViolationException e) {
            // 같은 카카오 계정이나 같은 닉네임으로 동시에 가입하면 유일 조건에 걸린다. 새 트랜잭션으로 한 번만 다시 한다.
            user = transaction.execute(status -> findOrSignUp(kakao));
        }
        if (user.getStatus() == UserStatus.SUSPENDED) {
            throw new ApiException(ErrorCode.SUSPENDED, suspendedMessage(user));
        }
        return tokenService.issue(user);
    }

    private User findOrSignUp(KakaoUser kakao) {
        return socialAccountRepository.findByProviderAndProviderUserId(SocialProvider.KAKAO, kakao.id())
                .map(account -> userRepository.findActiveById(account.getUser().getId())
                        .orElseThrow(() -> new ApiException(ErrorCode.WITHDRAWN)))
                .orElseGet(() -> signUp(kakao));
    }

    private User signUp(KakaoUser kakao) {
        if (kakao.email() == null || kakao.email().isBlank() || !kakao.emailVerified()) {
            throw new ApiException(ErrorCode.EMAIL_NOT_VERIFIED);
        }
        if (userRepository.existsByEmailIgnoreCase(kakao.email())) {
            throw new ApiException(ErrorCode.EMAIL_ALREADY_REGISTERED);
        }
        User user = userRepository.save(User.createSocial(kakao.email(), nicknameFor(kakao.nickname())));
        socialAccountRepository.save(UserSocialAccount.builder()
                .user(user)
                .provider(SocialProvider.KAKAO)
                .providerUserId(kakao.id())
                .providerEmail(kakao.email())
                .build());
        return user;
    }

    /** 카카오 닉네임이 규칙에 맞고 비어 있으면 쓰고, 아니면 "회원" 뒤에 숫자를 붙인다 */
    private String nicknameFor(String kakaoNickname) {
        if (kakaoNickname != null && NICKNAME.matcher(kakaoNickname).matches()
                && !userRepository.existsByNickname(kakaoNickname)) {
            return kakaoNickname;
        }
        for (int i = 0; i < NICKNAME_TRIES; i++) {
            String candidate = "회원" + nicknameNumber.getAsInt();
            if (!userRepository.existsByNickname(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("비어 있는 닉네임을 만들지 못했습니다.");
    }

    private static String suspendedMessage(User user) {
        String reason = user.getSuspendedReason();
        String base = ErrorCode.SUSPENDED.getMessage();
        return reason == null || reason.isBlank() ? base : base + " 사유: " + reason;
    }
}
