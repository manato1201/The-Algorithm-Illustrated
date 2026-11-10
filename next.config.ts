import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy。このサイトは外部のスクリプト・画像・API を使わない(フォントは next/font がビルド時に自前配信)。
//  - script/style の 'unsafe-inline': Next の起動用インラインスクリプトと、layout.tsx のテーマ初期化のため。
//    nonce を使うには動的な描画が要るので、まずは origin を絞ることで守る(本文の HTML はビルド時に自分の content から作る)。
//  - 'unsafe-eval' は開発サーバー(React の開発ビルド)だけ。
//  - upgrade-insecure-requests は付けない(ローカルの http で `next start` を確認できなくなるため。HTTPS は HSTS で足りる)。
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // frame-ancestors と同じ意味。古いブラウザ向け。
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // 独自ドメインを足したあとにサブドメインへ広げないよう、includeSubDomains は付けない。
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
