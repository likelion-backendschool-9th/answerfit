import { NextResponse, type NextRequest } from "next/server";
import { finishKakaoLogin } from "@/features/auth/api";
import { landing } from "@/features/auth/landing";

/** 카카오가 인가 코드를 들고 돌아오는 곳. 카카오 앱에 등록한 Redirect URI와 같아야 한다 */
export async function GET(request: NextRequest) {
  const result = await finishKakaoLogin(request.nextUrl.searchParams);
  const base = process.env.SITE_URL ?? request.url;
  if (result.ok) return NextResponse.redirect(new URL(await landing(result.next), base));
  const url = new URL("/login", base);
  url.searchParams.set("error", result.error);
  if (result.next !== "/") url.searchParams.set("next", result.next);
  return NextResponse.redirect(url);
}
