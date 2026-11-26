package com.likelion.answerfit.question.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.Map;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.likelion.answerfit.question.auth.QuestionPrincipal;
import com.likelion.answerfit.question.entity.Category;
import com.likelion.answerfit.question.entity.Question;
import com.likelion.answerfit.question.entity.QuestionMajor;
import com.likelion.answerfit.question.repository.CategoryRepository;
import com.likelion.answerfit.question.service.CategoryService;
import com.likelion.answerfit.user.entity.Role;
import com.likelion.answerfit.user.entity.UserStatus;

import jakarta.persistence.EntityManager;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@Transactional
class CategoryIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private CategoryService categoryService;

    private final QuestionPrincipal member = new TestPrincipal(1L, Role.USER, UserStatus.ACTIVE, null);

    @Test
    void 시작할_때_기본_분류를_등록하고_공개_질문이_없어도_순서대로_반환한다() throws Exception {
        mockMvc.perform(get("/api/v1/categories").principal(member))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.majors", hasSize(2)))
                .andExpect(jsonPath("$.majors[0].major").value("CS"))
                .andExpect(jsonPath("$.majors[0].name").value("CS"))
                .andExpect(jsonPath("$.majors[0].questionCount").value(0))
                .andExpect(jsonPath("$.majors[0].categories[*].name",
                        contains("운영체제", "네트워크", "데이터베이스", "자료구조", "알고리즘", "웹")))
                .andExpect(jsonPath("$.majors[0].categories[0].id").isString())
                .andExpect(jsonPath("$.majors[0].categories[0].sortOrder").value(10))
                .andExpect(jsonPath("$.majors[0].categories[0].questionCount").value(0))
                .andExpect(jsonPath("$.majors[1].major").value("PERSONALITY"))
                .andExpect(jsonPath("$.majors[1].name").value("인성 면접"))
                .andExpect(jsonPath("$.majors[1].questionCount").value(0))
                .andExpect(jsonPath("$.majors[1].categories[*].name",
                        contains("협업", "성장", "지원 동기", "문제 해결")));
    }

    @Test
    void 실제_DB의_공개_질문만_집계하고_중분류_없는_인성도_대분류에_포함한다() throws Exception {
        Category os = category(QuestionMajor.CS, "운영체제");
        Category teamwork = category(QuestionMajor.PERSONALITY, "협업");

        persist(Question.createByAdmin(QuestionMajor.CS, os, "프로세스란 무엇인가요?", "답안", null, 99L));
        Question generating = Question.createByUser(QuestionMajor.CS, os, "가상 메모리란 무엇인가요?", 1L);
        generating.approve(99L);
        persist(generating);
        Question failed = Question.createByUser(QuestionMajor.CS, os, "문맥 교환은 무엇인가요?", 1L);
        failed.approve(99L);
        failed.failModelAnswer();
        persist(failed);

        persist(Question.createByUser(QuestionMajor.CS, os, "아직 대기 중인 질문입니다.", 1L));
        Question rejected = Question.createByUser(QuestionMajor.CS, os, "반려된 질문의 예시입니다.", 1L);
        rejected.reject(99L);
        persist(rejected);
        Question hidden = Question.createByAdmin(QuestionMajor.CS, os, "숨긴 질문의 예시입니다.", "답안", null, 99L);
        hidden.hide();
        persist(hidden);
        Question deleted = Question.createByAdmin(QuestionMajor.CS, os, "삭제한 질문의 예시입니다.", "답안", null, 99L);
        deleted.deleteByAdmin();
        persist(deleted);

        persist(Question.createByAdmin(QuestionMajor.PERSONALITY, teamwork, "팀에서 갈등을 해결한 경험은?", "답안", null, 99L));
        persist(Question.createByAdmin(QuestionMajor.PERSONALITY, null, "중분류 없는 인성 질문입니다.", "답안", null, 99L));
        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(get("/api/v1/categories").principal(member))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.majors[0].questionCount").value(3))
                .andExpect(jsonPath("$.majors[0].categories", hasSize(6)))
                .andExpect(jsonPath("$.majors[0].categories[0].id").value(os.getId().toString()))
                .andExpect(jsonPath("$.majors[0].categories[0].questionCount").value(3))
                .andExpect(jsonPath("$.majors[0].categories[1].questionCount").value(0))
                .andExpect(jsonPath("$.majors[1].questionCount").value(2))
                .andExpect(jsonPath("$.majors[1].categories[0].questionCount").value(1));
    }

    @Test
    void 초기화를_반복해도_기존_ID와_관리한_정렬값과_추가_분류를_보존한다() {
        Category os = category(QuestionMajor.CS, "운영체제");
        os.changeSortOrder(99);
        Category custom = Category.builder().major(QuestionMajor.CS).name("사용자 정의 분류").sortOrder(5).build();
        entityManager.persist(custom);
        entityManager.flush();
        Map<String, Long> originalIds = categoryIds();

        categoryService.initializeDefaultCategories();
        categoryService.initializeDefaultCategories();
        entityManager.flush();
        entityManager.clear();

        assertThat(categoryRepository.count()).isEqualTo(11);
        assertThat(categoryIds()).isEqualTo(originalIds);
        assertThat(category(QuestionMajor.CS, "운영체제").getSortOrder()).isEqualTo(99);
        assertThat(category(QuestionMajor.CS, "사용자 정의 분류").getId()).isEqualTo(custom.getId());
    }

    @Test
    void 기본_분류가_일부_없으면_누락된_분류만_보충한다() {
        entityManager.remove(category(QuestionMajor.CS, "네트워크"));
        entityManager.flush();
        Map<String, Long> existingIds = categoryIds();

        categoryService.initializeDefaultCategories();
        entityManager.flush();
        entityManager.clear();

        assertThat(categoryRepository.count()).isEqualTo(10);
        assertThat(categoryIds()).containsAllEntriesOf(existingIds);
        assertThat(category(QuestionMajor.CS, "네트워크").getSortOrder()).isEqualTo(20);
    }

    @Test
    void DB에_카테고리가_없어도_두_대분류와_빈_목록을_반환한다() throws Exception {
        entityManager.createQuery("delete from Category").executeUpdate();
        entityManager.clear();

        mockMvc.perform(get("/api/v1/categories").principal(member))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.majors", hasSize(2)))
                .andExpect(jsonPath("$.majors[0].major").value("CS"))
                .andExpect(jsonPath("$.majors[0].questionCount").value(0))
                .andExpect(jsonPath("$.majors[0].categories").isEmpty())
                .andExpect(jsonPath("$.majors[1].major").value("PERSONALITY"))
                .andExpect(jsonPath("$.majors[1].questionCount").value(0))
                .andExpect(jsonPath("$.majors[1].categories").isEmpty());
    }

    private Category category(QuestionMajor major, String name) {
        return entityManager.createQuery(
                        "select category from Category category where category.major = :major and category.name = :name",
                        Category.class)
                .setParameter("major", major)
                .setParameter("name", name)
                .getSingleResult();
    }

    private Map<String, Long> categoryIds() {
        return categoryRepository.findAll().stream().collect(Collectors.toMap(
                category -> category.getMajor() + ":" + category.getName(), Category::getId));
    }

    private void persist(Question question) {
        entityManager.persist(question);
    }

    private record TestPrincipal(Long userId, Role role, UserStatus status, Instant deletedAt)
            implements QuestionPrincipal {
    }
}
