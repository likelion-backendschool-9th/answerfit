import "server-only";
import { todayInSeoul } from "@/features/interview/setup";
import type { AnswerState, BankQuestion, PendingQuestion, QuestionDraft, ReportEntry, ReportStatus, ReportedQuestion } from "@/features/admin/types";
import { findSimilar } from "@/features/question/rules";
import type { ArchiveQuestion, ModelAnswer, ReportInput } from "@/features/question/types";
import { demoDate, demoTime } from "./clock";
import { readStore, writeStore } from "./store";

const LIKES = "likes";
const LIKED_ANSWERS = "liked-answers";
const SUBMISSIONS = "submissions";
const BANK_EDITS = "bank-edits";
const REPORTS = "reports";
const REPORT_STATUS = "report-status";
const MAX_MINE = 10;
/** 승인한 뒤 AI가 모범답안을 만드는 시간 */
const GENERATE_MS = 8000;

type Seed = [id: string, category: string, text: string, likes: number, summary: string, body: string, keywords: string[], table?: ModelAnswer["table"]];

/** 최근에 올라온 것부터 */
const CS: Seed[] = [
  ["tcp-udp", "네트워크", "TCP와 UDP의 차이를 설명하고, 각각 어떤 서비스에 쓰이는지 예를 들어 주세요.", 128, "TCP는 연결을 맺고 순서와 도착을 보장하는 신뢰성 중심 프로토콜이고, UDP는 연결 없이 빠르게 보내는 속도 중심 프로토콜이에요.", "면접에서는 \"왜 그 서비스에 그 프로토콜을 쓰는지\"까지 말하면 좋아요. 예를 들어 영상 통화는 몇 프레임이 빠져도 끊기지 않는 게 중요해서 UDP를, 결제 요청은 데이터가 하나라도 빠지면 안 돼서 TCP를 써요.", ["연결 지향 · 비연결", "3-way handshake", "흐름 제어", "혼잡 제어", "순서 보장", "실시간성"],
    { head: ["구분", "TCP", "UDP"], rows: [["연결 방식", "연결 지향 (3-way handshake)", "비연결"], ["신뢰성", "재전송 · 흐름 제어 · 혼잡 제어", "보장하지 않음"], ["순서", "순서 보장", "보장하지 않음"], ["속도", "상대적으로 느림", "빠름 · 헤더가 작음"], ["쓰임새", "웹(HTTP), 이메일, 파일 전송", "실시간 스트리밍, 게임, DNS"]] }],
  ["url", "네트워크", "브라우저 주소창에 URL을 입력하면 화면이 뜨기까지 어떤 일이 일어나나요?", 214, "주소를 해석하고, DNS로 IP를 찾고, 연결을 맺어 요청을 보낸 뒤, 받은 문서를 그려요.", "DNS 조회, TCP 연결과 TLS 핸드셰이크, HTTP 요청과 응답, HTML·CSS 해석과 렌더링 순서로 말하면 빠뜨리지 않아요. 캐시가 어느 단계에 있는지 덧붙이면 더 좋아요.", ["DNS", "TCP 연결", "TLS", "HTTP 요청", "렌더링"]],
  ["handshake", "네트워크", "TCP 3-way handshake와 4-way handshake 과정을 설명해 주세요.", 96, "연결할 때는 SYN, SYN-ACK, ACK 세 단계로 서로의 순서 번호를 맞추고, 끊을 때는 양쪽이 따로 FIN과 ACK를 주고받아 네 단계가 돼요.", "끊을 때 한 단계가 더 필요한 것은 상대가 아직 보낼 데이터가 남아 있을 수 있기 때문이에요. TIME_WAIT가 필요한 까닭까지 이어서 말해 보세요.", ["SYN", "ACK", "FIN", "순서 번호", "TIME_WAIT"]],
  ["https", "네트워크", "HTTP와 HTTPS의 차이, 그리고 TLS 핸드셰이크가 하는 일을 설명해 주세요.", 87, "HTTPS는 HTTP를 TLS로 감싸 기밀성, 무결성, 서버 인증을 더한 것이에요.", "핸드셰이크에서는 사용할 암호 방식을 정하고, 인증서로 서버를 확인하고, 이후 통신에 쓸 대칭 키를 나눠 가져요. 처음부터 대칭 키를 쓰지 않는 까닭을 함께 말해 보세요.", ["TLS", "인증서", "대칭 키", "공개 키", "무결성"]],
  ["rest", "네트워크", "REST API를 설계할 때 지켜야 할 원칙과 자주 하는 실수를 말해 주세요.", 61, "자원은 주소로, 동작은 HTTP 메서드로 나타내고, 서버가 클라이언트 상태를 갖지 않게 해요.", "주소에 동사를 넣거나, 모든 응답을 200으로 주거나, GET으로 데이터를 바꾸는 것이 흔한 실수예요. 멱등성을 예로 들면 설득력이 있어요.", ["자원", "HTTP 메서드", "무상태", "멱등성", "상태 코드"]],
  ["cors", "네트워크", "CORS가 무엇이고, 왜 브라우저에서만 발생하나요?", 58, "다른 출처의 자원을 쓰도록 서버가 허용하는 방법이고, 출처를 검사하는 주체가 브라우저라서 브라우저에서만 문제가 돼요.", "동일 출처 정책을 먼저 말하고, 사전 요청이 언제 나가는지, 어떤 헤더로 허용하는지 순서로 설명해 보세요.", ["동일 출처 정책", "사전 요청", "Access-Control-Allow-Origin"]],
  ["l4l7", "네트워크", "L4 로드밸런싱과 L7 로드밸런싱의 차이는?", 44, "L4는 IP와 포트를 보고 나누고, L7은 주소나 헤더 같은 요청 내용을 보고 나눠요.", "L4는 내용을 열어 보지 않아 빠르고, L7은 경로에 따라 다른 서버로 보낼 수 있어요. 서비스에서 무엇이 필요한지에 맞춰 고른 예를 말해 보세요.", ["IP와 포트", "HTTP 헤더", "경로 기반 분산", "TLS 종료"]],
  ["cookie", "네트워크", "쿠키와 세션, 토큰 방식 로그인의 차이를 설명해 주세요.", 73, "세션은 상태를 서버에 두고, 토큰은 상태를 토큰 안에 담아 클라이언트가 들고 있어요.", "서버를 여러 대로 늘릴 때의 차이와, 토큰을 취소하기 어려운 문제를 함께 말하면 좋아요.", ["세션 저장소", "JWT", "만료", "HttpOnly"]],
  ["dns", "네트워크", "DNS가 도메인 이름을 IP 주소로 바꾸는 과정을 설명해 주세요.", 39, "캐시를 먼저 보고, 없으면 루트, 최상위, 권한 네임서버를 차례로 물어 찾아요.", "재귀 질의와 반복 질의를 구분하고, TTL이 하는 일을 덧붙여 보세요.", ["캐시", "루트 네임서버", "재귀 질의", "TTL"]],
  ["process", "운영체제", "프로세스와 스레드의 차이, 그리고 멀티스레드에서 생길 수 있는 문제는 무엇인가요?", 176, "프로세스는 독립된 메모리를 갖고, 스레드는 한 프로세스의 메모리를 나눠 써요.", "스레드는 전환 비용이 작지만 하나가 잘못되면 함께 영향을 받아요. 멀티 프로세스를 고른 예를 말해 보세요.", ["메모리 공유", "컨텍스트 스위칭", "동기화"]],
  ["deadlock", "운영체제", "데드락이 생기는 네 가지 조건과 해결 방법을 설명해 주세요.", 88, "상호 배제, 점유 대기, 비선점, 순환 대기가 모두 갖춰지면 생겨요.", "네 조건 중 하나를 깨는 예방, 회피, 탐지와 회복 순서로 말하고, 잠금 순서를 정하는 실무 예를 들어 보세요.", ["상호 배제", "점유 대기", "비선점", "순환 대기"]],
  ["paging", "운영체제", "가상 메모리와 페이징이 필요한 까닭을 설명해 주세요.", 52, "실제 메모리보다 큰 주소 공간을 주고, 프로그램을 같은 크기로 나눠 올려 외부 단편화를 없애요.", "페이지 폴트가 났을 때의 순서와 교체 알고리즘을 이어서 설명해 보세요.", ["페이지 테이블", "페이지 폴트", "TLB", "단편화"]],
  ["schedule", "운영체제", "CPU 스케줄링 알고리즘을 두 가지 이상 비교해 주세요.", 37, "FCFS는 단순하지만 오래 걸리는 작업이 뒤를 막고, 라운드 로빈은 시간을 나눠 응답이 빨라요.", "선점과 비선점으로 나누고, 기아 문제와 에이징을 덧붙여 보세요.", ["선점", "라운드 로빈", "기아", "에이징"]],
  ["isolation", "데이터베이스", "트랜잭션 격리 수준을 설명해 주세요.", 167, "READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE 네 단계가 있고, 높을수록 안전하지만 동시성이 떨어져요.", "각 단계에서 생기는 Dirty Read, Non-Repeatable Read, Phantom Read를 짝지어 말하고, 쓰는 데이터베이스의 기본값을 덧붙여 보세요.", ["Dirty Read", "Non-Repeatable Read", "Phantom Read", "MVCC"]],
  ["index", "데이터베이스", "인덱스는 어떻게 조회를 빠르게 하고, 언제 오히려 느려지나요?", 142, "정렬된 B+Tree를 따라가 읽을 양을 줄이지만, 쓰기와 저장 공간 비용이 늘어요.", "카디널리티가 낮은 열이나 함수로 감싼 조건에서는 쓰이지 않는 예를 말해 보세요.", ["B+Tree", "카디널리티", "커버링 인덱스", "쓰기 비용"]],
  ["normal", "데이터베이스", "정규화와 반정규화를 언제 선택하는지 설명해 주세요.", 64, "정규화로 중복과 이상 현상을 없애고, 조회가 느리면 근거를 갖고 반정규화해요.", "조인 비용을 먼저 측정하고, 반정규화한 값을 맞추는 방법까지 말하면 좋아요.", ["이상 현상", "제3정규형", "조인", "중복"]],
  ["hash", "자료구조", "해시 테이블에서 충돌이 생기면 어떻게 해결하나요?", 9, "체이닝은 같은 칸에 이어 붙이고, 개방 주소법은 빈 칸을 찾아가요.", "적재율이 높아질 때의 차이와 재해싱을 함께 말해 보세요.", ["체이닝", "개방 주소법", "적재율", "재해싱"]],
  ["stack-queue", "자료구조", "스택과 큐의 차이와 쓰이는 예를 설명해 주세요.", 45, "스택은 나중에 넣은 것을, 큐는 먼저 넣은 것을 먼저 꺼내요.", "함수 호출과 되돌리기, 작업 대기열과 너비 우선 탐색을 예로 들어 보세요.", ["LIFO", "FIFO", "함수 호출", "BFS"]],
  ["complexity", "알고리즘", "시간 복잡도와 공간 복잡도를 함께 따져야 하는 예를 들어 주세요.", 22, "메모리를 더 써서 시간을 줄이거나 그 반대를 골라야 할 때 함께 따져요.", "메모이제이션, 해시 테이블, 정렬의 추가 공간을 예로 들고, 입력 크기와 제한을 먼저 확인한다고 말해 보세요.", ["시간 복잡도", "공간 복잡도", "절충"]],
  ["sort", "알고리즘", "퀵 정렬과 병합 정렬을 비교해 주세요.", 66, "퀵 정렬은 평균이 빠르고 추가 공간이 적지만 최악이 O(n²)이고, 병합 정렬은 항상 O(n log n)이지만 공간이 더 필요해요.", "피벗 선택과 안정 정렬 여부를 덧붙여 보세요.", ["피벗", "안정 정렬", "분할 정복"]],
  ["dp", "알고리즘", "동적 계획법을 쓸 수 있는 조건을 설명해 주세요.", 41, "겹치는 부분 문제와 최적 부분 구조가 있을 때 써요.", "메모이제이션과 타뷸레이션을 비교하고 간단한 예를 들어 보세요.", ["부분 문제", "메모이제이션", "점화식"]],
  ["rendering", "웹", "서버 사이드 렌더링과 클라이언트 사이드 렌더링을 비교해 주세요.", 57, "SSR은 첫 화면과 검색에 유리하고, CSR은 이후 이동이 빨라요.", "하이드레이션과 서버 부담을 함께 말하면 좋아요.", ["첫 화면", "검색 노출", "하이드레이션"]],
  ["cache", "웹", "브라우저 캐시와 CDN 캐시의 차이를 설명해 주세요.", 33, "브라우저 캐시는 한 사람의 기기에, CDN 캐시는 사용자와 가까운 서버에 저장돼요.", "Cache-Control과 ETag로 어떻게 제어하는지, 배포할 때 어떻게 비우는지 말해 보세요.", ["Cache-Control", "ETag", "무효화"]],
];
/** 내가 등록해 승인된 질문 */
const MY_APPROVED: { seed: Seed; createdOn: string; approvedOn: string }[] = [
  { createdOn: "2026-11-08", approvedOn: "2026-11-10", seed: ["my-isolation", "데이터베이스", "트랜잭션 격리 수준 4가지와 각각에서 생길 수 있는 문제를 설명해 주세요.", 37, "READ UNCOMMITTED부터 SERIALIZABLE까지 네 단계이고, 낮을수록 더 많은 이상 현상을 허용해요.", "Dirty Read, Non-Repeatable Read, Phantom Read를 각 단계와 짝지어 말하고, MVCC가 어떻게 막는지 덧붙여 보세요.", ["Dirty Read", "Phantom Read", "MVCC"]] },
  { createdOn: "2026-10-30", approvedOn: "2026-11-01", seed: ["my-jwt", "웹", "JWT와 세션 기반 인증의 차이, 그리고 각각의 단점은 무엇인가요?", 41, "세션은 서버가 상태를 갖고, JWT는 토큰이 상태를 담아요.", "세션은 서버를 늘릴 때 저장소가 필요하고, JWT는 만료 전에 취소하기 어려워요. 리프레시 토큰으로 줄이는 방법을 말해 보세요.", ["세션 저장소", "서명", "만료", "리프레시 토큰"]] },
  { createdOn: "2026-10-15", approvedOn: "2026-10-17", seed: ["my-docker", "운영체제", "도커 컨테이너와 가상 머신은 무엇이 다른가요?", 23, "컨테이너는 호스트 커널을 나눠 쓰고, 가상 머신은 운영체제를 통째로 올려요.", "네임스페이스와 cgroup으로 격리한다는 점, 시작 속도와 보안 경계의 차이를 말해 보세요.", ["커널 공유", "네임스페이스", "cgroup", "하이퍼바이저"]] },
];
const PERSONALITY: Seed[] = [
  ["p-conflict", "협업", "팀원과 의견이 달랐던 경험과 해결 과정을 말씀해 주세요.", 92, "상황, 서로의 근거, 합의한 기준, 결과 순서로 말해요.", "누가 옳았는지보다 어떤 기준으로 합의했는지를 보여 주세요.", ["상황", "근거", "합의 기준", "결과"]],
  ["p-fail", "성장", "가장 크게 실패한 경험과 그 뒤에 바꾼 점을 말씀해 주세요.", 81, "실패를 숨기지 않고, 배운 점과 바뀐 행동을 구체적으로 말해요.", "다시 같은 상황에서 실제로 다르게 행동한 예가 있으면 가장 좋아요.", ["원인", "배운 점", "바뀐 행동"]],
  ["p-join", "지원 동기", "우리 회사에 지원한 까닭을 말씀해 주세요.", 120, "회사가 푸는 문제와 내 경험이 만나는 지점을 말해요.", "어느 회사에나 할 수 있는 말은 빼고, 직접 써 본 경험을 넣어 보세요.", ["서비스 이해", "내 경험", "기여"]],
  ["p-weak", "성장", "본인의 가장 큰 단점은 무엇인가요?", 35, "단점을 하나 고르고, 줄이려고 실제로 한 일을 말해요.", "장점을 단점처럼 말하기보다, 일에 미친 영향과 바뀐 점을 구체적으로 말해 보세요.", ["단점", "영향", "개선"]],
  ["p-priority", "문제 해결", "할 일이 한꺼번에 몰렸을 때 어떻게 순서를 정하나요?", 48, "영향과 마감으로 나누고, 관련된 사람과 먼저 맞춰요.", "실제로 일정을 조율한 예를 들어 보세요.", ["영향", "마감", "조율"]],
];

const toQuestion =
  (kind: ArchiveQuestion["kind"]) =>
  ([id, category, text, likes, summary, body, keywords, table]: Seed): ArchiveQuestion => ({ id, kind, category, text, likes, liked: false, mine: false, status: "approved", reported: false, answer: { summary, body, keywords, table } });

/** 처음부터 좋아요한 질문 */
const DEFAULT_LIKED = ["tcp-udp", "process", "index", "handshake", "l4l7", "cookie", "deadlock", "isolation", "p-conflict"];
const DEFAULT_LIKED_ANSWERS = ["demo-sample/sample-Q2", "demo-sample/sample-Q4", "demo-rec-1/cs-1"];
/** 승인 전인 내 질문을 끼워 넣는 자리 */
const MINE_AT = 4;

/** 아직 모범답안이 없는 질문 */
const NO_ANSWER = new Set(["hash"]);

type Item = ArchiveQuestion & { code: string; source: string | null; hidden: boolean; answerState: AnswerState; updatedOn: string; answerText: string };

/** 목업에 있는 번호. 나머지는 순서대로 매긴다 */
const CODES: Record<string, number> = { "tcp-udp": 412, "my-isolation": 398, process: 391, "p-conflict": 388, "my-jwt": 371, "p-fail": 365, index: 352, complexity: 347, hash: 340, "p-weak": 318, https: 290, l4l7: 287, rest: 270 };
const UPDATED: Record<string, string> = { "tcp-udp": "2026-11-02", "my-isolation": "2026-11-10", process: "2026-10-28", "p-conflict": "2026-10-25", "my-jwt": "2026-11-01", "p-fail": "2026-10-20", index: "2026-11-24", complexity: "2026-10-12", hash: "2026-10-08" };
const FIRST_OTHER_CODE = 264;
const codeText = (number: number) => `Q-${String(number).padStart(4, "0")}`;

const answerText = (answer: ModelAnswer | null) => (answer ? [answer.summary, answer.body].filter(Boolean).join("\n\n") : "");

/** 첫 문단을 요약으로, 나머지를 본문으로 쓴다. 비교표는 남긴다 */
function toAnswer(text: string, keywords: string[], table?: ModelAnswer["table"]): ModelAnswer | null {
  const [summary, ...rest] = text.split(/\n\s*\n/);
  return summary.trim() ? { summary: summary.trim(), body: rest.join("\n\n").trim(), keywords, table } : null;
}

export const generatedAnswer = (text: string) => ({
  answer: `"${text}"에 대한 시연용 모범답안이에요. 핵심을 한 문장으로 먼저 말해요.\n\n근거와 예시를 하나씩 붙이고, 실제로 쓴 경험이 있으면 결과까지 말해 보세요. AI를 연동하면 이 자리에 실제 답안이 나와요.`,
  keywords: ["핵심 정의", "근거", "예시"],
});

function seedBank(): Item[] {
  const mine = MY_APPROVED.map(({ seed, createdOn, approvedOn }) => ({ ...toQuestion("cs")(seed), mine: true, createdOn: demoDate(createdOn), approvedOn: demoDate(approvedOn) }));
  let other = FIRST_OTHER_CODE;
  return [...CS.map(toQuestion("cs")), ...mine, ...PERSONALITY.map(toQuestion("personality"))].map((question) => {
    const answer = NO_ANSWER.has(question.id) ? null : question.answer;
    return {
      ...question,
      answer,
      code: codeText(CODES[question.id] ?? other--),
      source: question.mine ? "지우" : null,
      hidden: false,
      answerState: answer ? "ready" : "none",
      updatedOn: demoDate(UPDATED[question.id] ?? "2026-10-01"),
      answerText: answerText(answer),
    };
  });
}

type DemoQuestionInput = { category: string; text: string };
type Submission = DemoQuestionInput & { id: string; code: string; nickname: string; email: string; mine: boolean; createdAt: string; approvedAt: number | null };

const defaultSubmissions = (): Submission[] => [
  { id: "mine-l4l7", code: "U-0087", category: "네트워크", text: "로드밸런서의 L4와 L7 방식은 어떻게 다른가요?", nickname: "지우", email: "jiwoo@answerfit.kr", mine: true, createdAt: demoTime("2026-11-24", "23:52"), approvedAt: null },
  { id: "user-cap", code: "U-0086", category: "데이터베이스", text: "CAP 이론을 실제 서비스 설계 예시로 설명해 주세요.", nickname: "민준", email: "minjun@answerfit.kr", mine: false, createdAt: demoTime("2026-11-23", "18:20"), approvedAt: null },
  { id: "user-gc", code: "U-0085", category: "운영체제", text: "가비지 컬렉션은 언제, 어떻게 동작하고 서비스에 어떤 영향을 주나요?", nickname: "서연", email: "seoyeon@answerfit.kr", mine: false, createdAt: demoTime("2026-11-22", "10:07"), approvedAt: null },
];
const readSubmissions = () => readStore<Submission[]>(SUBMISSIONS, defaultSubmissions());

/** 관리자가 바꾼 것 */
type BankEdits = { edited: Record<string, QuestionDraft & { updatedOn: string }>; added: { id: string; code: string }[]; removed: string[]; hidden: Record<string, boolean> };
const NO_EDITS: BankEdits = { edited: {}, added: [], removed: [], hidden: { cache: true } };
const readEdits = () => readStore<BankEdits>(BANK_EDITS, NO_EDITS);

const today = () => todayInSeoul(new Date());

/** 승인한 질문은 문제 은행에 들어간다. 모범답안은 잠시 뒤에 생긴다 */
function fromSubmission({ id, category, text, nickname, mine, createdAt, approvedAt }: Submission, code: string): Item {
  const ready = approvedAt !== null && Date.now() - approvedAt >= GENERATE_MS;
  const generated = generatedAnswer(text);
  const approvedOn = approvedAt === null ? undefined : todayInSeoul(new Date(approvedAt));
  return {
    id, kind: "cs", category, text, likes: 0, liked: false, mine, reported: false, code, hidden: false, approvedOn,
    status: approvedAt === null ? "pending" : "approved",
    createdOn: todayInSeoul(new Date(createdAt)),
    answer: ready ? toAnswer(generated.answer, generated.keywords) : null,
    answerState: ready ? "ready" : "generating",
    answerText: ready ? generated.answer : "",
    source: nickname,
    updatedOn: approvedOn ?? todayInSeoul(new Date(createdAt)),
  };
}

/** 문제 은행의 모든 질문. 숨긴 것도 들어 있다 */
async function readBank(): Promise<Item[]> {
  const [edits, submissions] = await Promise.all([readEdits(), readSubmissions()]);
  const seeds = seedBank();
  const top = Math.max(...Object.values(CODES));
  const approved = submissions.filter(({ approvedAt }) => approvedAt !== null).map((one, i) => fromSubmission(one, codeText(top + edits.added.length + i + 1)));
  const added = edits.added.map(({ id, code }): Item => ({ id, code, kind: "cs", category: "", text: "", likes: 0, liked: false, mine: false, status: "approved", reported: false, answer: null, source: null, hidden: false, answerState: "ready", updatedOn: today(), answerText: "" }));
  return [...added, ...seeds.slice(0, MINE_AT), ...approved, ...seeds.slice(MINE_AT)]
    .filter(({ id }) => !edits.removed.includes(id))
    .map((item) => {
      const hidden = edits.hidden[item.id] ?? false;
      const edit = edits.edited[item.id];
      if (!edit) return { ...item, hidden };
      const answer = toAnswer(edit.answer, edit.keywords, item.answer?.table);
      return { ...item, hidden, kind: edit.kind, category: edit.category, text: edit.text, answer, answerState: "ready" as const, answerText: edit.answer, updatedOn: edit.updatedOn };
    });
}

const readLiked = () => readStore<string[]>(LIKES, DEFAULT_LIKED);

async function withLikes(items: Item[]): Promise<Item[]> {
  const liked = await readLiked();
  return items.map((item) => {
    const isLiked = liked.includes(item.id);
    // 처음부터 좋아요한 질문은 개수에 이미 들어 있다
    return { ...item, liked: isLiked, likes: item.likes - (DEFAULT_LIKED.includes(item.id) ? 1 : 0) + (isLiked ? 1 : 0) };
  });
}

/** 회원이 보는 질문. 숨긴 질문은 빠지고, 승인 전인 내 질문이 들어 있다 */
export async function listDemoQuestions(): Promise<ArchiveQuestion[]> {
  const [bank, submissions, reports] = await Promise.all([readBank(), readSubmissions(), readReports()]);
  const pending = submissions.filter(({ mine, approvedAt }) => mine && approvedAt === null).map((one) => ({ ...fromSubmission(one, one.code), answer: null }));
  const open = bank.filter(({ hidden }) => !hidden);
  const items = await withLikes([...open.slice(0, MINE_AT), ...pending, ...open.slice(MINE_AT)]);
  return items.map(({ id, kind, category, text, likes, liked, mine, status, createdOn, approvedOn, answer }) => ({ id, kind, category, text, likes, liked, mine, status, createdOn, approvedOn, answer, reported: reports.some((report) => report.questionId === id) }));
}

export async function likeDemoQuestion(id: string, liked: boolean) {
  const others = (await readLiked()).filter((one) => one !== id);
  await writeStore(LIKES, liked ? [...others, id] : others);
}

/** 더 등록할 수 없으면 null */
export async function addDemoQuestion({ category, text }: DemoQuestionInput, who: { nickname: string; email: string }): Promise<string | null> {
  const submissions = await readSubmissions();
  if (submissions.filter(({ mine, approvedAt }) => mine && approvedAt === null).length >= MAX_MINE) return null;
  const id = `mine-${Date.now().toString(36)}`;
  const last = Math.max(87, ...submissions.map(({ code }) => Number(code.slice(2))));
  const added: Submission = { id, code: `U-${String(last + 1).padStart(4, "0")}`, category, text, ...who, mine: true, createdAt: new Date().toISOString(), approvedAt: null };
  await writeStore(SUBMISSIONS, [added, ...submissions]);
  return id;
}

export async function updateDemoQuestion(id: string, { category, text }: DemoQuestionInput) {
  await writeStore(
    SUBMISSIONS,
    (await readSubmissions()).map((one) => (one.id === id ? { ...one, category, text } : one)),
  );
}

export async function removeDemoQuestion(id: string) {
  await writeStore(
    SUBMISSIONS,
    (await readSubmissions()).filter((one) => one.id !== id),
  );
}

export const readDemoLikedAnswers = () => readStore<string[]>(LIKED_ANSWERS, DEFAULT_LIKED_ANSWERS);

export async function likeDemoAnswer(id: string, liked: boolean) {
  const others = (await readDemoLikedAnswers()).filter((one) => one !== id);
  await writeStore(LIKED_ANSWERS, liked ? [...others, id] : others);
}

// ---------- 관리자 ----------
export async function listDemoBank(): Promise<BankQuestion[]> {
  const items = await withLikes(await readBank());
  return items
    .map(({ id, code, kind, category, text, answerState, hidden, source, likes, updatedOn, answerText: answer, answer: model }) => ({ id, code, kind, category, text, answerState, hidden, source, likes, updatedOn, answer, keywords: model?.keywords ?? [] }))
    .sort((a, b) => b.code.localeCompare(a.code));
}

export async function listDemoPending(): Promise<PendingQuestion[]> {
  const [bank, submissions] = await Promise.all([readBank(), readSubmissions()]);
  const candidates = bank.filter(({ kind }) => kind === "cs");
  return submissions
    .filter(({ approvedAt }) => approvedAt === null)
    .map(({ id, code, category, text, nickname, email, createdAt }) => {
      const similar = findSimilar(candidates, text);
      return { id, code, category, text, nickname, email, createdAt, similar: similar && { id: similar.id, code: similar.code, text: similar.text } };
    });
}

export async function approveDemoQuestion(id: string) {
  await writeStore(
    SUBMISSIONS,
    (await readSubmissions()).map((one) => (one.id === id ? { ...one, approvedAt: Date.now() } : one)),
  );
}

/** id가 없으면 새로 등록한다 */
export async function saveDemoBank(id: string | null, draft: QuestionDraft) {
  const edits = await readEdits();
  const bank = await readBank();
  const target = id ?? `admin-${Date.now().toString(36)}`;
  const last = Math.max(...bank.map(({ code }) => Number(code.slice(2))));
  await writeStore(BANK_EDITS, {
    ...edits,
    added: id ? edits.added : [{ id: target, code: codeText(last + 1) }, ...edits.added],
    edited: { ...edits.edited, [target]: { ...draft, updatedOn: today() } },
  });
}

export async function removeDemoBank(ids: string[]) {
  const edits = await readEdits();
  await writeStore(BANK_EDITS, { ...edits, removed: [...new Set([...edits.removed, ...ids])] });
}

type Report = ReportEntry & { questionId: string };
const defaultReports = (): Report[] => [
  { questionId: "tcp-udp", reason: "모범답안이 틀렸어요", detail: "DNS는 응답이 512바이트를 넘으면 TCP로 다시 요청한다는 설명이 빠져 있어요.", at: demoTime("2026-11-25", "01:12") },
  { questionId: "tcp-udp", reason: "모범답안이 틀렸어요", detail: "비교표에서 UDP 헤더 크기(8바이트)가 빠졌어요.", at: demoTime("2026-11-24", "22:40") },
  { questionId: "cache", reason: "모범답안이 틀렸어요", detail: "CDN도 브라우저처럼 Cache-Control을 따라요.", at: demoTime("2026-11-24", "15:02") },
  { questionId: "cache", reason: "모범답안이 틀렸어요", detail: "", at: demoTime("2026-11-24", "11:30") },
  { questionId: "cache", reason: "모범답안이 틀렸어요", detail: "", at: demoTime("2026-11-23", "20:11") },
  { questionId: "cache", reason: "질문 내용이 사실과 달라요", detail: "", at: demoTime("2026-11-22", "09:45") },
  { questionId: "p-weak", reason: "부적절한 표현이 있어요", detail: "압박처럼 느껴져요.", at: demoTime("2026-11-20", "19:08") },
  { questionId: "https", reason: "이미 있는 질문과 중복돼요", detail: "", at: demoTime("2026-11-18", "21:20") },
  { questionId: "https", reason: "이미 있는 질문과 중복돼요", detail: "TLS 질문이 또 있어요.", at: demoTime("2026-11-17", "13:33") },
  { questionId: "https", reason: "기타", detail: "", at: demoTime("2026-11-16", "08:10") },
  { questionId: "rest", reason: "질문 내용이 사실과 달라요", detail: "", at: demoTime("2026-11-12", "17:55") },
];
/** 회원이 시연에서 한 신고 */
const readReports = () => readStore<Report[]>(REPORTS, []);
const readStatuses = () => readStore<Record<string, ReportStatus>>(REPORT_STATUS, { cache: "hidden", rest: "closed" });

export async function reportDemoQuestion({ questionId, reason, detail }: ReportInput) {
  const [reports, statuses] = await Promise.all([readReports(), readStatuses()]);
  await writeStore(REPORTS, [{ questionId, reason, detail, at: new Date().toISOString() }, ...reports]);
  // 끝난 신고도 새 신고가 오면 다시 확인한다
  if (statuses[questionId] === "closed") await writeStore(REPORT_STATUS, { ...statuses, [questionId]: "waiting" });
}

export async function listDemoReports(): Promise<ReportedQuestion[]> {
  const [bank, reports, statuses] = await Promise.all([readBank(), readReports(), readStatuses()]);
  const entries = [...reports, ...defaultReports()].sort((a, b) => b.at.localeCompare(a.at));
  const ids = [...new Set(entries.map(({ questionId }) => questionId))];
  return ids.flatMap((id): ReportedQuestion[] => {
    const question = bank.find((one) => one.id === id);
    if (!question) return [];
    const own = entries.filter(({ questionId }) => questionId === id).map(({ reason, detail, at }) => ({ reason, detail, at }));
    return [{ id, code: question.code, text: question.text, status: statuses[id] ?? "waiting", entries: own }];
  });
}

/** 숨기면 아카이브에서 빠지고, 끝내거나 다시 공개하면 돌아온다 */
export async function settleDemoReport(id: string, status: ReportStatus) {
  const [edits, statuses] = await Promise.all([readEdits(), readStatuses()]);
  await writeStore(REPORT_STATUS, { ...statuses, [id]: status });
  await writeStore(BANK_EDITS, { ...edits, hidden: { ...edits.hidden, [id]: status === "hidden" } });
}
