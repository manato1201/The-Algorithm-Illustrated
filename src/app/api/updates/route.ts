import { NextResponse } from "next/server";
import { fetchUpdates } from "@/lib/updates";

/**
 * 更新情報画面(/updates)向けのBFF。ui-design.md 3節#4「更新情報(RSSフィード)」に対応。
 * 外部フィードの取得・整形をEdge Function側に閉じ込め、ブラウザには整形済みJSONだけを返す。
 */
export const runtime = "edge";

export async function GET() {
  try {
    const items = await fetchUpdates();
    return NextResponse.json(
      { items },
      {
        headers: {
          "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        items: [],
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 502 },
    );
  }
}
