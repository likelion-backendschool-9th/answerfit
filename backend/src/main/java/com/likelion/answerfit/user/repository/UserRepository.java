package com.likelion.answerfit.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.likelion.answerfit.user.entity.User;

public interface UserRepository extends JpaRepository<User, Long> {
    boolean existsByNickname(String nickname);
}
