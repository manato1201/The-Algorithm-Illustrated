import Link from "next/link";
import styles from "./page.module.css";
import { UpdatesFeed } from "@/components/updates/UpdatesFeed";

/**
 * 更新情報画面(ui-design.md 3節#4)。実務モード(装飾なし)で構成する。
 * データ取得自体はクライアント側からVercel Edge Functions BFF(/api/updates)を叩く。
 */
export default function UpdatesPage() {
  return (
    <div className={styles.page}>
      <Link href="/" className={styles.backLink}>
        ← カタログに戻る
      </Link>
      <header className={styles.header}>
        <p className={styles.eyebrow}>■ UPDATES 更新情報</p>
        <h1 className={styles.title}>外部の技術記事フィード</h1>
        <p className={styles.lead}>
          Vercel Edge
          Functions(BFF)経由でQiitaの人気記事フィードを中継取得し、カード表示しています。
        </p>
      </header>
      <UpdatesFeed />
    </div>
  );
}
