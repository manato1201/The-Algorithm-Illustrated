import { ImageResponse } from "next/og";
import { MarkSvg } from "@/lib/mark";

// PWA(manifest)用。maskable でも欠けないよう、全面を塗り、マークは安全領域(中央 80%)の内側へ置く。
export function GET() {
  return new ImageResponse(<MarkSvg size={192} rx={0} inset={0.16} />, { width: 192, height: 192 });
}
