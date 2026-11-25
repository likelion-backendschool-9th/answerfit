import { questionHref } from "@/features/question/paths";

/** 화면 주소. 아직 없는 화면은 준비 중 안내로 간다 */
export const PATHS = {
  home: "/",
  login: "/login",
  signup: "/signup",
  newInterview: "/interviews/new",
  guide: "/guide",
  archive: "/archive",
  question: questionHref,
  my: "/my",
  myInterviews: "/my/interviews",
  myDocuments: "/my/documents",
  myQuestions: "/my/questions",
  myLikes: "/my/likes",
  mySettings: "/my/settings",
  admin: "/admin",
  adminQuestions: "/admin/questions",
  adminMembers: "/admin/members",
  notifications: "/notifications",
  interview: (id: string) => `/interviews/${id}`,
  interviewAnalyzing: (id: string) => `/interviews/${id}/analyzing`,
  interviewResult: (id: string) => `/interviews/${id}/result`,
} as const;
