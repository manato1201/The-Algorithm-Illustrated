import { CornerBrackets } from "./CornerBrackets";
import { StatusChip } from "./StatusChip";
import { LiveClock } from "./LiveClock";
import styles from "./AppShell.module.css";

type AppShellProps = {
  children: React.ReactNode;
};

/**
 * 全画面共通のHUDフレーム(docs/design/ui-design.md 2.6節・3節)。
 * ヘッダー(ブランド+ステータスチップ+ライブ時計)とコーナーブラケットを提供する。
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className={styles.frame}>
      <CornerBrackets />
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandDot} aria-hidden="true" />
          <span className={styles.brandName}>THE ALGORITHM ILLUSTRATED</span>
          <span className={styles.brandSub}>
            状態分離型 インタラクティブ・アルゴリズム図鑑
          </span>
        </div>
        <div className={styles.headerRight}>
          <StatusChip status="online" />
          <LiveClock />
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
