import "server-only";
import { readApiResponse } from "./api-response";

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

/** 백엔드 호출. 성공하면 ApiResponse의 data를 돌려준다(docs/api-response.md) */
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

  const result = readApiResponse<T>(response.status, await response.json().catch(() => null));
  if (result.ok) return result.data;
  if (result.notConnected) throw new ApiNotConnectedError(path);
  throw new ApiError(response.status, result.code, result.message);
}
