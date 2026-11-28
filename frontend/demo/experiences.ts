import "server-only";
import type { Experience } from "@/features/experience/types";
import { readStore, writeStore } from "./store";

const KEY = "experiences";

function seed(): Experience[] {
  return [
    {
      id: "demo-exp-1", title: "중고거래 플랫폼 백엔드 개발", type: "PROJECT", startedOn: "2025-03-04", endedOn: "2025-08-30", organization: "멋쟁이사자처럼 백엔드 스쿨", role: "백엔드 팀장",
      tags: ["문제해결능력", "협업", "리더십"],
      content: "상품 목록 조회가 3초 넘게 걸려 이탈이 늘었다. 쿼리 실행 계획을 확인해 N+1 문제를 찾고 페치 조인과 인덱스로 고쳤다.",
      result: "목록 응답 시간 3.2초 → 0.4초\n주간 활성 사용자 1.8배 증가\n팀원 4명과 코드 리뷰 규칙을 만들어 배포 장애 0건",
    },
    {
      id: "demo-exp-2", title: "결제 서버 인턴", type: "INTERN", startedOn: "2025-09-01", endedOn: null, organization: "다라페이", role: "서버 개발 인턴",
      tags: ["전문성", "책임감"],
      content: "정산 배치가 자정에 몰려 실패하던 문제를 맡았다. 작업을 가맹점 단위로 나눠 재시도할 수 있게 바꿨다.",
      result: "정산 배치 실패율 4% → 0.2%",
    },
    {
      id: "demo-exp-3", title: "카페 아르바이트", type: "PART_TIME", startedOn: "2024-06-01", endedOn: "2024-12-31", organization: "동네 카페", role: "바리스타",
      tags: ["고객지향"], content: "", result: "단골 고객 적립 이벤트를 제안해 재방문율 상승",
    },
    {
      id: "demo-exp-4", title: "알고리즘 스터디 운영", type: "CLUB", startedOn: "2024-03-02", endedOn: "2024-11-30", organization: "컴퓨터공학과 학회", role: "스터디장",
      tags: ["자기개발능력", "꾸준함"], content: "매주 문제 5개를 풀고 서로 풀이를 설명했다.", result: "",
    },
    {
      id: "demo-exp-5", title: "공공데이터 활용 공모전", type: "CONTEST", startedOn: "2024-07-15", endedOn: "2024-09-20", organization: "행정안전부", role: "데이터 분석·API 개발",
      tags: ["정보능력", "분석력", "협업"], content: "", result: "장려상 수상",
    },
  ];
}

export const listDemoExperiences = () => readStore(KEY, seed());

export async function saveDemoExperience(experience: Experience) {
  const items = await listDemoExperiences();
  const found = items.some(({ id }) => id === experience.id);
  await writeStore(KEY, found ? items.map((item) => (item.id === experience.id ? experience : item)) : [...items, experience]);
}

export async function removeDemoExperience(id: string) {
  await writeStore(KEY, (await listDemoExperiences()).filter((item) => item.id !== id));
}
