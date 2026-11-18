"use client";

import { useEffect, useState } from "react";
import styles from "./BackToTop.module.css";

/** 画面 1.5 枚分より下までスクロールしたら出す(短いページでは出さない)。 */
const SHOW_AFTER_VIEWPORTS = 1.5;

/**
 * ページの先頭へ戻るボタン(右下に固定)。長い一覧・長い記事で、読み終わったあとの戻り道になる。
 * 出入りは opacity と transform だけ。スクロールは CSS の scroll-behavior に従う
 * (動きを減らす設定では即時、globals.css)。再レンダリングは「出る/隠れる」が変わるときだけ。
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setVisible(window.scrollY > window.innerHeight * SHOW_AFTER_VIEWPORTS);
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
    <button
      type="button"
      className={styles.button}
      data-visible={visible}
      aria-label="ページの先頭へ戻る"
      tabIndex={visible ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0 })}
    >
      <svg
        viewBox="0 0 16 16"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M8 13V3" />
        <path d="M3.5 7.5 8 3l4.5 4.5" />
      </svg>
    </button>
  );
}
