import type { Metadata } from "next";
import { Noto_Sans_KR, Roboto_Mono } from "next/font/google";
import "./globals.css";

const noto = Noto_Sans_KR({ variable: "--font-noto", preload: false, display: "swap" });
const code = Roboto_Mono({ variable: "--font-code", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "ANSWERFIT", template: "%s | ANSWERFIT" },
  description: "카메라를 켜고 말로 답하는 AI 모의 면접",
  icons: { icon: "/brand/logo-light.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${noto.variable} ${code.variable}`}>
      <body>{children}</body>
    </html>
  );
}
