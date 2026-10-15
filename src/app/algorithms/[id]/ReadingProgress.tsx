"use client";

import { useEffect, useRef } from "react";
import styles from "./page.module.css";

/**
 * 読了バー(スクロール連動、設計書 動き09)。長い記事のどこまで読んだかを、画面上端の細い線で示す。
 * 見た目の遷移(transition)は付けず、スクロール位置にそのまま追従する。stateは持たず、DOMの
 * transformを直接更新するので、スクロールのたびに再レンダリングは起きない。
 */
export function ReadingProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const bar = barRef.current;
      if (!bar) return;
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress =
        scrollable <= 0
          ? 0
          : Math.min(1, Math.max(0, window.scrollY / scrollable));
      bar.style.transform = `scaleX(${progress})`;
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
  }, []);

  return (
    <div className={styles.readingTrack} aria-hidden="true">
      <div ref={barRef} className={styles.readingBar} />
    </div>
  );
}
