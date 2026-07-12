import Link from "next/link";
import styles from "./page.module.css";

const STACK_ITEMS: { label: string; value: string }[] = [
  { label: "フロントエンド", value: "Next.js (App Router + TypeScript)" },
  { label: "ホスティング/BFF", value: "Vercel(Edge Functionsで外部RSSを中継)" },
  { label: "並列処理", value: "Web Workers(可視化のステップ列生成)" },
  { label: "描画", value: "Canvas API(ソート・経路探索・グラフ)、HTML+CSS(DPテーブル)、pixi.js(パーティクル演出)" },
  { label: "コンテンツ", value: "Markdown + フロントマター(content/algorithms/、163件)" },
];

/**
 * Aboutページ(ui-design.md 3節#5、優先度低)。装飾を持たない実務モードの静的ページ。
 */
export default function AboutPage() {
  return (
    <div className={styles.page}>
      <Link href="/" className={styles.backLink}>
        ← カタログに戻る
      </Link>
      <header className={styles.header}>
        <p className={styles.eyebrow}>■ ABOUT このサイトについて</p>
        <h1 className={styles.title}>状態分離型 インタラクティブ・アルゴリズム図鑑</h1>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionLabel}>■ CONCEPT コンセプト</h2>
        <p className={styles.paragraph}>
          アルゴリズムがどのような目的で生まれ、どう動くのかを可視化・時間巻き戻し可能な形で学べる学習ダッシュボードです。速さを競うランキングではなく、なぜ生まれ、どう動き、どこで報われるのかを理解することを目的としています。
        </p>
        <p className={styles.paragraph}>
          状態遷移の可視化は一歩ずつ再生・巻き戻しができ、比較画面ではアルゴリズム同士のトレードオフを並べて眺められます。個人の学習用に継続開発している非商用のプロジェクトです。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionLabel}>■ STACK 技術スタック</h2>
        <dl className={styles.stackList}>
          {STACK_ITEMS.map((item) => (
            <div key={item.label} className={styles.stackRow}>
              <dt className={styles.stackLabel}>{item.label}</dt>
              <dd className={styles.stackValue}>{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionLabel}>■ SOURCE ソース</h2>
        <p className={styles.paragraph}>
          リポジトリは{" "}
          <a
            className={styles.link}
            href="https://github.com/manato1201/The-Algorithm-Illustrated"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>{" "}
          で公開しています。
        </p>
      </section>
    </div>
  );
}
