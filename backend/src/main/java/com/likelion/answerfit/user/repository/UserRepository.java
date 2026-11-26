package com.likelion.answerfit.user.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.likelion.answerfit.user.entity.User;

// User의 @SQLRestriction 때문에 조회 쿼리는 탈퇴하지 않은 회원만 본다.
public interface UserRepository extends JpaRepository<User, Long> {

    @Query("select u from User u where u.id = :id")
    Optional<User> findActiveById(Long id);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByNickname(String nickname);
}
