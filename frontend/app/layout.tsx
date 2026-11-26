import type { Metadata } from "next";
import { Archivo, Noto_Sans_KR, Roboto_Mono } from "next/font/google";
import "./globals.css";

const noto = Noto_Sans_KR({ variable: "--font-noto", preload: false, display: "swap" });
const brand = Archivo({ variable: "--font-brand", weight: "700", subsets: ["latin"], display: "swap" });
const code = Roboto_Mono({ variable: "--font-code", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "ANSWERFIT", template: "%s | ANSWERFIT" },
  description: "카메라를 켜고 말로 답하는 AI 모의 면접",
  icons: { icon: "/brand/logo-light.png" },
};

/** auth는 화면 안에서 로그인을 누르면 뜨는 모달 자리다(app/@auth) */
export default function RootLayout({ children, auth }: Readonly<{ children: React.ReactNode; auth: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${noto.variable} ${brand.variable} ${code.variable}`}>
      <body>
        {children}
        {auth}
      </body>
    </html>
  );
}
