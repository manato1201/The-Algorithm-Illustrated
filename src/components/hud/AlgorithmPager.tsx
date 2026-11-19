"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import styles from "./AlgorithmPager.module.css";

export type PagerItem = { id: string; name: string };

type AlgorithmPagerProps = {
  prev: PagerItem | null;
  next: PagerItem | null;
  /** compact: ヘッダー・固定バー用の小さなボタン。full: ページ末尾用(名前つきの大きなリンク)。 */
  variant?: "compact" | "full";
  /** `[` `]` キーで前後へ移動する。ページに 1 つだけ有効にする(← → は可視化のステップ送りが使っている)。 */
  keyboard?: boolean;
};

/** 入力欄・選択欄・編集可能領域にフォーカスがあるときは、キー操作を横取りしない。 */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

/**
 * 詳細ページの「前へ / 次へ」(カテゴリ順 → 同カテゴリ内。順序は lib/adjacent-algorithms.ts)。
 * 最初のアルゴリズムの「前へ」・最後の「次へ」はリンクにせず、aria-disabled で無効表示にする。
 */
export function AlgorithmPager({
  prev,
  next,
  variant = "compact",
  keyboard = false,
}: AlgorithmPagerProps) {
  const router = useRouter();

  useEffect(() => {
    if (!keyboard) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      if (isTypingTarget(event.target)) return;
      // 配列によって `[` の物理キーが違うので、押された文字(event.key)で判定する
      const target = event.key === "[" ? prev : event.key === "]" ? next : undefined;
      if (target === undefined) return;
      event.preventDefault();
      if (target) router.push(`/algorithms/${target.id}`);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [keyboard, prev, next, router]);

  const full = variant === "full";
  return (
    <nav
      className={`${styles.pager} ${full ? styles.full : styles.compact}`}
      aria-label="前後のアルゴリズム"
    >
      {prev ? (
        <Link
          href={`/algorithms/${prev.id}`}
          className={`${styles.item} ${styles.prev}`}
          rel="prev"
          title={`前: ${prev.name}(キー [ )`}
        >
          <span className={styles.label}>
            <span aria-hidden="true">← </span>前へ
          </span>
          {full ? <span className={styles.name}>{prev.name}</span> : null}
        </Link>
      ) : (
        <span
          className={`${styles.item} ${styles.prev} ${styles.disabled}`}
          role="link"
          aria-disabled="true"
        >
          <span className={styles.label}>
            <span aria-hidden="true">← </span>前へ
          </span>
          {full ? <span className={styles.name}>最初のアルゴリズムです</span> : null}
        </span>
      )}
      {next ? (
        <Link
          href={`/algorithms/${next.id}`}
          className={`${styles.item} ${styles.next}`}
          rel="next"
          title={`次: ${next.name}(キー ] )`}
        >
          <span className={styles.label}>
            次へ<span aria-hidden="true"> →</span>
          </span>
          {full ? <span className={styles.name}>{next.name}</span> : null}
        </Link>
      ) : (
        <span
          className={`${styles.item} ${styles.next} ${styles.disabled}`}
          role="link"
          aria-disabled="true"
        >
          <span className={styles.label}>
            次へ<span aria-hidden="true"> →</span>
          </span>
          {full ? <span className={styles.name}>最後のアルゴリズムです</span> : null}
        </span>
      )}
      {full ? (
        <p className={styles.hint}>
          キーボードの <kbd>[</kbd> <kbd>]</kbd> でも前後へ移動できます。
        </p>
      ) : null}
    </nav>
  );
}
