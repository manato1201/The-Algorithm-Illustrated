import { CornerBrackets } from "./CornerBrackets";
import { StatusChip } from "./StatusChip";
import { LiveClock } from "./LiveClock";
import { NavLinks } from "./NavLinks";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./AppShell.module.css";

type AppShellProps = {
  children: React.ReactNode;
};

const NAV_ITEMS: { href: string; label: string }[] = [
  { href: "/basics", label: "アルゴリズムとは?" },
  { href: "/", label: "カタログ" },
  { href: "/atlas", label: "年表" },
  { href: "/compare", label: "比較" },
  { href: "/updates", label: "更新情報" },
  { href: "/about", label: "About" },
];

/**
 * 全画面共通のHUDフレーム(docs/design/ui-design.md 2.6節・3節)。
 * ヘッダー(ブランド+ナビゲーション+ステータスチップ+ライブ時計+テーマ切替)とコーナーブラケットを提供する。
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
        <NavLinks items={NAV_ITEMS} />
        <div className={styles.headerRight}>
          <StatusChip status="online" />
          <LiveClock />
          <ThemeToggle />
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
