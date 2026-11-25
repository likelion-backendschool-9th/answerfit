/** 화면 주소. 아직 없는 화면은 준비 중 안내로 간다 */
export const PATHS = {
  home: "/",
  login: "/login",
  signup: "/signup",
  newInterview: "/interviews/new",
  guide: "/guide",
  archive: "/archive",
  question: (id: string) => `/archive/${encodeURIComponent(id)}`,
  my: "/my",
  notifications: "/notifications",
  interview: (id: string) => `/interviews/${id}`,
  interviewAnalyzing: (id: string) => `/interviews/${id}/analyzing`,
  interviewResult: (id: string) => `/interviews/${id}/result`,
} as const;
