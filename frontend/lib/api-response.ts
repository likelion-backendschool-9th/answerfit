/** 백엔드 응답 { success, data, error }를 읽는다. 형식은 docs/api-response.md */

const DEFAULT_MESSAGE = "요청을 처리하지 못했어요.";
/** 백엔드에 아직 없는 API: API_NOT_FOUND, METHOD_NOT_ALLOWED */
const NOT_CONNECTED_CODES = ["BACKEND-GLOBAL-103", "BACKEND-GLOBAL-104"];

export type ApiResult<T> = { ok: true; data: T } | { ok: false; notConnected: boolean; code?: string; message: string };
export type ApiResponseFormat = "envelope" | "plain";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

function failure(status: number, code: string | undefined, message: string): ApiResult<never> {
  // 백엔드가 없는 경로라고 답했거나, 우리 형식이 아닌 404·405·501이면 아직 없는 API로 본다
  const notConnected = [404, 405, 501].includes(status) && (!code || NOT_CONNECTED_CODES.includes(code));
  return { ok: false, notConnected, code, message };
}

export function readApiResponse<T>(status: number, body: unknown, format: ApiResponseFormat = "envelope"): ApiResult<T> {
  const success = status >= 200 && status < 300;
  // 문제은행의 기존 평문 계약을 통합하기 전까지 명시한 호출에서만 허용한다.
  // 같은 요청도 Security 필터·전역 오류는 ApiResponse로 답하므로 그 형식은 공통 경로로 읽는다.
  const envelope = isRecord(body) && "success" in body;
  if (format === "plain" && !envelope) {
    if (success) return { ok: true, data: body as T };
    const code = isRecord(body) && typeof body.code === "string" ? body.code : undefined;
    const message = isRecord(body) && typeof body.message === "string" && body.message ? body.message : DEFAULT_MESSAGE;
    return failure(status, code, message);
  }

  if (success && isRecord(body) && body.success === true) return { ok: true, data: body.data as T };
  if (success) return { ok: false, notConnected: false, message: "응답 형식이 올바르지 않아요." };

  const error = isRecord(body) && isRecord(body.error) ? body.error : null;
  const code = typeof error?.errorCode === "string" ? error.errorCode : undefined;
  const message = typeof error?.detail === "string" && error.detail ? error.detail : DEFAULT_MESSAGE;
  return failure(status, code, message);
}
