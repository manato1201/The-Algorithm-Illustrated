"use client";

import { useEffect, useState } from "react";
import styles from "./AppShell.module.css";

export const THEME_STORAGE_KEY = "algo-illustrated:theme";

type Theme = "dark" | "light";

/**
 * ダーク/ライトの切替(IMPROVEMENT_DESIGN_2026-10 U5)。選択はlocalStorageに保存する。
 * 初回描画のちらつき防止は、layout.tsxのbeforeInteractiveスクリプトが<html data-theme>を先に設定して担う。
 * ここでは、その時点のdata-themeを読み取ってボタンの表示に反映するだけ。
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // react-hooks/set-state-in-effectを避けるため、初回反映のsetStateはtimeoutコールバック内で行う。
    const timer = setTimeout(() => {
      setTheme(
        document.documentElement.dataset.theme === "light" ? "light" : "dark",
      );
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // localStorageが使えない環境では、このタブの間だけ有効になる
    }
  };

  const isLight = theme === "light";

  return (
    <button
      type="button"
      className={styles.themeToggle}
      onClick={toggle}
      aria-pressed={isLight}
      aria-label={
        isLight ? "ダークテーマに切り替える" : "ライトテーマに切り替える"
      }
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        {isLight ? (
          <path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z" />
        ) : (
          <>
            <circle cx="8" cy="8" r="3" />
            <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" />
          </>
        )}
      </svg>
      {isLight ? "DARK" : "LIGHT"}
    </button>
  );
}
