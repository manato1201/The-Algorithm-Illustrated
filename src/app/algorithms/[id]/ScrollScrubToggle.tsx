"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";
import { useScrubBridge } from "@/components/visualizer/ScrubBridge";

/**
 * 「解説のスクロールで再生を進める」トグル(スクロール連動のピン留め+スクラブ)。
 * オフが既定(通常画面は静かに保つ)。オンの間、解説の「仕組み」セクションを読み進めるのに合わせて、
 * 固定表示の可視化のステップが進む。セクションが見つからない記事では、解説全体の進み具合を使う。
 */
export function ScrollScrubToggle() {
  const bridge = useScrubBridge();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!enabled || !bridge) return;

    const findSection = (): { top: number; height: number } | null => {
      const body = document.querySelector<HTMLElement>("[data-markdown-body]");
      if (!body) return null;
      const headings = Array.from(body.querySelectorAll<HTMLElement>("h2"));
      const start = headings.find((h) => h.textContent?.includes("仕組み"));
      const bodyRect = body.getBoundingClientRect();
      if (!start) return { top: bodyRect.top, height: bodyRect.height };
      const next = headings[headings.indexOf(start) + 1];
      const startTop = start.getBoundingClientRect().top;
      const endTop = next ? next.getBoundingClientRect().top : bodyRect.bottom;
      return { top: startTop, height: Math.max(endTop - startTop, 1) };
    };

    let frame = 0;
    const update = () => {
      frame = 0;
      const section = findSection();
      if (!section) return;
      // 画面の上から40%の位置を「読んでいる位置」とみなす
      const anchor = window.innerHeight * 0.4;
      bridge.scrubProgress((anchor - section.top) / section.height);
    };
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [enabled, bridge]);

  if (!bridge) return null;

  return (
    <button
      type="button"
      className={styles.scrubToggle}
      aria-pressed={enabled}
      onClick={() => setEnabled((current) => !current)}
      title="解説を読み進めるのに合わせて、左の可視化のステップを進めます"
    >
      <span aria-hidden="true">{enabled ? "■" : "□"}</span> 解説のスクロールで再生を進める
    </button>
  );
}
