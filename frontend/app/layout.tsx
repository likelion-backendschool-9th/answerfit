import type { Metadata } from "next";
import { Archivo, Noto_Sans_KR, Roboto_Mono } from "next/font/google";
import { InlineScript } from "./_components/InlineScript/InlineScript";
import { THEME_SCRIPT } from "./_lib/theme";
import "./globals.css";

const noto = Noto_Sans_KR({ variable: "--font-noto", preload: false, display: "swap" });
const brand = Archivo({ variable: "--font-brand", weight: "700", subsets: ["latin"], display: "swap" });
const code = Roboto_Mono({ variable: "--font-code", subsets: ["latin"], display: "swap" });

// 파비콘은 모드에 따라 바뀌어야 해서 metadata.icons 대신 THEME_SCRIPT가 <link>를 만든다
export const metadata: Metadata = {
  title: { default: "ANSWERFIT", template: "%s | ANSWERFIT" },
  description: "카메라를 켜고 말로 답하는 AI 모의 면접",
};

/**
 * 주간·야간 모드. 서버는 사용자 설정을 모르므로 light로 그리고, <head>의 스크립트가 그리기 전에
 * 저장된 선택(없으면 기기 설정)으로 data-theme을 바꾸고 파비콘을 단다. 그 값을 React가 덮어쓰지 않게 suppressHydrationWarning을 둔다.
 * auth는 화면 안에서 로그인을 누르면 뜨는 모달 자리다(app/@auth).
 */
export default function RootLayout({ children, auth }: Readonly<{ children: React.ReactNode; auth: React.ReactNode }>) {
  return (
    <html lang="ko" data-theme="light" suppressHydrationWarning className={`${noto.variable} ${brand.variable} ${code.variable}`}>
      <head>
        <InlineScript html={THEME_SCRIPT} />
      </head>
      <body>
        {children}
        {auth}
      </body>
    </html>
  );
}
