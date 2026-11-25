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

/** 백엔드 호출. 오류 형식은 { code, message }로 가정한다(미확정) */
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
  // Spring은 없는 주소에도 JSON으로 404를 준다. 우리 오류 형식(code)이 없으면 아직 없는 API로 본다
  if ([404, 405, 501].includes(response.status) && !data?.code) throw new ApiNotConnectedError(path);
  throw new ApiError(response.status, data?.code, data?.message ?? "요청을 처리하지 못했어요.");
}
