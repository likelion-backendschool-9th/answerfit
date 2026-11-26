import "server-only";

/** 개발 모드에서 아직 없는 API를 불렀다. 목업으로 대신하지 않는다. digest는 오류 화면이 종류를 구분하는 데 쓴다 */
export class ApiNotConnectedError extends Error {
  digest = "API_NOT_CONNECTED";
  constructor(path: string) {
    super(`아직 연동되지 않은 API: ${path}`);
    this.name = "ApiNotConnectedError";
  }
}

/** 백엔드가 이유를 담아 거절했다 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Options = { method?: string; body?: object | FormData; token?: string };

/** 성공 응답은 호출자가 읽고, 공통 오류 응답과 기존 오류 형식은 여기서 처리한다. */
export async function callBackend<T>(path: string, { method = "GET", body, token }: Options = {}): Promise<T> {
  const base = process.env.BACKEND_URL;
  if (!base) throw new ApiNotConnectedError(path);

  const headers = new Headers({ Accept: "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const isForm = body instanceof FormData;
  if (body && !isForm) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(new URL(path, base), { method, headers, body: isForm ? body : body && JSON.stringify(body), cache: "no-store" });
  } catch {
    throw new ApiNotConnectedError(path);
  }

  const data = await response.json().catch(() => null);
  if (response.ok) return data as T;
  if (data?.success === false && typeof data.error?.errorCode === "string") {
    throw new ApiError(response.status, data.error.errorCode, data.error.detail ?? "요청을 처리하지 못했어요.");
  }
  // 오류 코드 없는 Spring 기본 응답은 아직 없는 API로 본다.
  if ([404, 405, 501].includes(response.status) && !data?.code) throw new ApiNotConnectedError(path);
  throw new ApiError(response.status, data?.code, data?.message ?? "요청을 처리하지 못했어요.");
}
