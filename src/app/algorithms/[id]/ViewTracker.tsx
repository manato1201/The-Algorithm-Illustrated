"use client";

import { useEffect } from "react";
import { recordRecentlyViewed } from "@/lib/recently-viewed";

/** 詳細ページを開いた時点で「最近見た」履歴(localStorage)に記録する。画面には何も描画しない。 */
export function ViewTracker({ id }: { id: string }) {
  useEffect(() => {
    recordRecentlyViewed(id);
  }, [id]);

  return null;
}
