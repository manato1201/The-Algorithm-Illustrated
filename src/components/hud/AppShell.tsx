import Link from "next/link";
import { CornerBrackets } from "./CornerBrackets";
import { StatusChip } from "./StatusChip";
import { LiveClock } from "./LiveClock";
import styles from "./AppShell.module.css";

type AppShellProps = {
  children: React.ReactNode;
};

const NAV_ITEMS: { href: string; label: string }[] = [
  { href: "/", label: "カタログ" },
  { href: "/compare", label: "比較" },
  { href: "/updates", label: "更新情報" },
  { href: "/about", label: "About" },
];

/**
 * 全画面共通のHUDフレーム(docs/design/ui-design.md 2.6節・3節)。
 * ヘッダー(ブランド+ナビゲーション+ステータスチップ+ライブ時計)とコーナーブラケットを提供する。
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
        <nav className={styles.nav} aria-label="メインナビゲーション">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={styles.navLink}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.headerRight}>
          <StatusChip status="online" />
          <LiveClock />
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
