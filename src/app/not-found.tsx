import Link from "next/link";
import styles from "./not-found.module.css";
import { LostDotMaze } from "@/components/not-found/LostDotMaze";

/**
 * 404ページ(app/not-found.tsx は未一致のURL全体とnotFound()の両方を受ける)。
 * 迷子の点が幅優先探索で出口を探す小さな遊びで、図鑑らしく「近い所から順に広げる」性質を見せる。
 */
export default function NotFound() {
  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>■ 404 NOT FOUND</p>
      <h1 className={styles.title}>
        ページが
        <span className={styles.accent}>迷子</span>
        です。
      </h1>
      <p className={styles.lead}>
        お探しのページは見つかりませんでした。下の点が、幅優先探索(BFS)で出口を探しています。
        近い所から順に広げていくので、最初に出口へ届いた道がそのまま最短になります。
      </p>
      <LostDotMaze />
      <nav className={styles.links} aria-label="戻り先">
        <Link href="/" className={styles.link}>
          カタログへ戻る <span aria-hidden="true">→</span>
        </Link>
        <Link href="/algorithms/bfs" className={styles.link}>
          幅優先探索(BFS)を見る <span aria-hidden="true">→</span>
        </Link>
      </nav>
    </div>
  );
}
