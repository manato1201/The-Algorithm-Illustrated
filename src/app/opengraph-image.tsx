import { ImageResponse } from "next/og";
import { MarkSvg } from "@/lib/mark";

// OGP 画像。日本語フォントを同梱しないため、英数字だけで構成する(マーク・名前・一言)。
export const alt = "The Algorithm Illustrated";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#06070a",
        color: "#edf0f5",
        padding: 80,
      }}
    >
      <MarkSvg size={96} rx={20} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 700, letterSpacing: -2 }}>The Algorithm Illustrated</div>
        <div
          style={{
            display: "flex",
            marginTop: 32,
            borderTop: "1px solid #242a38",
            paddingTop: 24,
            fontSize: 30,
            letterSpacing: 4,
            color: "#8b93a7",
          }}
        >
          ALGORITHMS, ILLUSTRATED
        </div>
      </div>
    </div>,
    size,
  );
}
