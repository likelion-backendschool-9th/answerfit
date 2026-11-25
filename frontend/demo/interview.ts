import "server-only";
import { cookies } from "next/headers";
import type { DocumentGroup, Interview, InterviewSetup, Question } from "@/features/interview/types";

const COOKIE = "demo-interview";
/** 분석 화면이 보이도록 잠시 기다린다 */
const ANALYZE_MS = 4500;

export const DEMO_GROUPS: DocumentGroup[] = [
  { id: "webtoon", name: "가나웹툰 · 백엔드 신입", shortName: "가나웹툰 · 백엔드", description: "자소서 PDF · 직무기술서 링크 · 면접일 12월 10일", interviewDate: "2026-12-10", error: null },
  { id: "pay", name: "다라페이 · 서버 개발", shortName: "다라페이 · 서버", description: "자소서 텍스트 · 직무기술서 PDF · 면접일 미입력", interviewDate: null, error: null },
  { id: "bank", name: "마바뱅크 · Server Developer", shortName: "마바뱅크 · Server", description: "", interviewDate: null, error: "직무기술서 링크 스캔 실패 — 텍스트로 붙여 넣어 주세요" },
];

type DemoQuestion = Question & { followUp?: string };
const make = (prefix: string, rows: [category: string, text: string, hint: string, followUp?: string][]): DemoQuestion[] =>
  rows.map(([category, text, hint, followUp], i) => ({ id: `${prefix}-${i + 1}`, category, text, hint, followUp }));

const QUESTIONS: Record<InterviewSetup["type"], DemoQuestion[]> = {
  experience: make("exp", [
    ["자기소개 · 지원 동기", "지원 직무에서 가장 자신 있는 역량을 실제 경험과 함께 말씀해 주세요.", "역량 한 가지를 먼저 말하고, 그 역량을 쓴 상황과 결과를 이어서 말해 보세요."],
    ["직무 역량 · 대용량 트래픽 처리", "트래픽이 갑자기 몰렸던 상황에서 서버 장애를 어떻게 해결했는지, 본인의 역할을 중심으로 설명해 주세요.", "병목 지점 파악, 캐시, 오토스케일링, 응답 시간 개선 수치 키워드를 활용하세요. 상황 → 내 역할 → 해결 방법 → 결과 순서로 말해 보세요. 결과는 숫자로 말하면 더 설득력 있어요.", "그 해결 방법 대신 고려했던 다른 방법은 무엇이었고, 왜 선택하지 않았나요?"],
    ["협업 · 의견 조율", "팀원과 기술 선택에서 의견이 달랐던 경험과, 어떻게 합의했는지 말씀해 주세요.", "서로의 근거, 판단 기준, 합의한 방법, 그 뒤의 결과를 순서대로 말해 보세요.", "지금 다시 같은 상황이라면 어떤 기준으로 결정하시겠어요?"],
    ["직무 역량 · 데이터 모델링", "프로젝트에서 테이블을 설계할 때 가장 고민한 부분은 무엇이었나요?", "정규화와 조회 성능 사이에서 무엇을 기준으로 골랐는지 말해 보세요."],
    ["문제 해결 · 디버깅", "원인을 찾기 가장 어려웠던 버그와, 찾아낸 과정을 설명해 주세요.", "가설, 확인 방법, 원인, 재발 방지 순서로 말해 보세요.", "같은 문제가 다시 생기지 않게 어떤 장치를 두었나요?"],
    ["품질 · 테스트", "테스트 코드를 작성하면서 설계가 바뀐 경험이 있나요?", "무엇이 테스트하기 어려웠고, 구조를 어떻게 바꿨는지 말해 보세요."],
    ["성장 · 학습", "최근에 새로 배운 기술을 프로젝트에 적용한 과정을 말씀해 주세요.", "왜 필요했는지, 어떻게 검증했는지 말해 보세요."],
    ["마무리 · 회고", "프로젝트를 다시 한다면 가장 먼저 바꾸고 싶은 부분은 무엇인가요?", "아쉬운 점과 바꿀 방법, 예상되는 효과를 말해 보세요."],
  ]),
  cs: make("cs", [
    ["데이터베이스 · 트랜잭션", "트랜잭션 격리 수준을 설명해 주세요.", "네 가지 격리 수준과 각 수준에서 생기는 이상 현상을 짝지어 말해 보세요.", "Phantom Read가 생기는 상황을 예로 들어 설명해 주세요."],
    ["네트워크 · TCP", "TCP의 3-way handshake 과정을 설명해 주세요.", "SYN, SYN-ACK, ACK와 각 단계에서 확인하는 것을 말해 보세요.", "연결을 끊을 때는 왜 네 단계가 필요한가요?"],
    ["운영체제 · 프로세스", "프로세스와 스레드의 차이를 설명해 주세요.", "메모리 공유 범위와 컨텍스트 스위칭 비용을 비교해 보세요."],
    ["데이터베이스 · 인덱스", "인덱스를 쓰면 조회가 빨라지는 이유와 단점을 설명해 주세요.", "B+Tree 구조와 쓰기 비용을 함께 말해 보세요.", "인덱스가 있어도 쓰이지 않는 경우를 말씀해 주세요."],
    ["네트워크 · HTTP", "HTTP와 HTTPS의 차이를 설명해 주세요.", "TLS가 보장하는 세 가지를 말해 보세요."],
    ["운영체제 · 동기화", "데드락이 생기는 네 가지 조건을 설명해 주세요.", "상호 배제, 점유 대기, 비선점, 순환 대기를 말해 보세요."],
    ["자료구조 · 해시", "해시 충돌을 해결하는 방법을 설명해 주세요.", "체이닝과 개방 주소법을 비교해 보세요."],
    ["Java · JVM", "가비지 컬렉션이 동작하는 과정을 설명해 주세요.", "Young, Old 영역과 Stop-the-world를 말해 보세요."],
  ]),
};

const open = ({ id, category, text, hint }: Question): Question => ({ id, category, text, hint });

export async function createDemoInterview(setup: InterviewSetup) {
  const id = `demo-${Date.now().toString(36)}`;
  (await cookies()).set(COOKIE, JSON.stringify({ id, mode: setup.mode, type: setup.type, count: setup.count }), { path: "/", sameSite: "lax", httpOnly: true });
  return id;
}

export async function findDemoInterview(id: string): Promise<Interview | null> {
  try {
    const saved = JSON.parse((await cookies()).get(COOKIE)?.value ?? "null");
    if (saved?.id !== id || !(saved.type in QUESTIONS)) return null;
    const questions = QUESTIONS[saved.type as InterviewSetup["type"]].slice(0, saved.count).map(open);
    if (questions.length === 0) return null;
    return { id, mode: saved.mode === "real" ? "real" : "practice", type: saved.type, questions };
  } catch {
    return null;
  }
}

export async function analyzeDemoAnswer(questionId: string): Promise<Question | null> {
  await new Promise((resolve) => setTimeout(resolve, ANALYZE_MS));
  const question = Object.values(QUESTIONS).flat().find(({ id }) => id === questionId);
  if (!question?.followUp) return null;
  return { id: `${question.id}-follow`, category: question.category, text: question.followUp, hint: "앞의 답변에서 빠진 근거를 한 가지 더해 짧게 말해 보세요." };
}
