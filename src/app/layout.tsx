import type { Metadata } from "next";
import {
  Zen_Kaku_Gothic_New,
  Space_Grotesk,
  Noto_Sans_JP,
  JetBrains_Mono,
} from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AppShell } from "@/components/hud/AppShell";
import { THEME_STORAGE_KEY } from "@/components/hud/ThemeToggle";

// 保存済みのテーマを描画前に<html data-theme>へ反映する(ダーク→ライトのちらつき防止)。
// データはlocalStorageの自分の設定値のみで、外部入力は含まない。
const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}`;

// 幾何学ゴシック(和文見出し用) — variableフォント非対応のため明示的にweightを指定
const zenKakuGothicNew = Zen_Kaku_Gothic_New({
  weight: ["500", "700", "900"],
  subsets: ["latin"],
  variable: "--font-display-raw",
});

// 英数字見出し・複雑度表記用
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display-en-raw",
});

// 本文用(和文)
const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-body-raw",
});

// コード・データ・状態値用(等幅)
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-raw",
});

export const metadata: Metadata = {
  title: "アルゴリズム図鑑 | The Algorithm Illustrated",
  description:
    "状態分離型 インタラクティブ・アルゴリズム図鑑 — アルゴリズムがどのような目的で生まれ、どう動くのかを可視化・時間巻き戻し可能な形で学べる学習ダッシュボード。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${zenKakuGothicNew.variable} ${spaceGrotesk.variable} ${notoSansJP.variable} ${jetBrainsMono.variable}`}
      // テーマ初期化スクリプトがdata-themeを付けるため、サーバー描画との差分を許容する
      suppressHydrationWarning
    >
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
