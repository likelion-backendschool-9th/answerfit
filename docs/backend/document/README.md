# document 도메인

서류(`documents`), 서류 그룹(`document_groups`), JD 역량(`document_competencies`), 경험(`user_experiences`)을 다룬다.

## 아직 정하지 않은 것

- [ ] TODO: 서류와 서류 그룹의 관계. 기획문서와 `documents.user_id` 주석은 서류 하나를 여러 서류 그룹에서 재사용(N:M)한다고 하지만, DDL은 `documents.document_groups_id NOT NULL`이라 서류마다 그룹이 하나(N:1)다. 재사용이 필요하면 연결 테이블(예: `document_group_items`)을 두고 `document_groups_id`를 뺀다. 지금 엔티티는 DDL대로 N:1이다(`Document.documentGroup`).
