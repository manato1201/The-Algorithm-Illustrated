"use client";

import { useEffect, useState } from "react";
import { AlgorithmPager, type PagerItem } from "./AlgorithmPager";
import { FavoriteButton } from "@/app/algorithms/[id]/FavoriteButton";
import styles from "./StickyTitleBar.module.css";

type StickyTitleBarProps = {
  id: string;
  name: string;
  prev: PagerItem | null;
  next: PagerItem | null;
  /** 監視する見出し(`<h1>`)の id。これが画面の上へ出たときだけバーを出す。 */
  targetId: string;
};

/**
 * 詳細ページの固定タイトルバー(アルゴリズム名・前へ/次へ・お気に入り)。
 * 見出しが画面の上へ出たときだけ現れる(IntersectionObserver)。動きは transform と opacity だけで、
 * 動きを減らす設定では即時に切り替わる。高さは `--titlebar-h`(詳細ページの左ペインの sticky の top と共有)。
 */
export function StickyTitleBar({ id, name, prev, next, targetId }: StickyTitleBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target || typeof IntersectionObserver === "undefined") return;
    // 上端のバーの高さ分を除いた範囲で見えているかを見る。上へ抜けたとき(下にあるときは出さない)だけ表示
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { rootMargin: "-44px 0px 0px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  return (
    <div className={styles.bar} data-visible={visible} role="region" aria-label="現在のアルゴリズム">
      <div className={styles.inner}>
        <span className={styles.name}>{name}</span>
        <AlgorithmPager prev={prev} next={next} variant="compact" />
        <FavoriteButton id={id} variant="icon" />
      </div>
    </div>
  );
}
