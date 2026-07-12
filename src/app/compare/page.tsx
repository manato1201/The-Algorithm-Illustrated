import Link from "next/link";
import styles from "./page.module.css";
import { CompareView } from "@/components/compare/CompareView";
import { getAllAlgorithmsMeta } from "@/lib/content/algorithms";

/**
 * 比較画面(ui-design.md 3節#3)。速さを競うランキングではなく、トレードオフ表を中心に構成する。
 */
export default function ComparePage() {
  const algorithms = getAllAlgorithmsMeta();
  return (
    <div className={styles.page}>
      <Link href="/" className={styles.backLink}>
        ← カタログに戻る
      </Link>
      <header className={styles.header}>
        <p className={styles.eyebrow}>■ COMPARE 比較</p>
        <h1 className={styles.title}>アルゴリズムを並べて比較する</h1>
        <p className={styles.lead}>
          速さのランキングではなく、カテゴリ・計算量・特性の違いを並べて眺めるための画面です。最大4件まで選択できます。
        </p>
      </header>
      <CompareView algorithms={algorithms} />
    </div>
  );
}
