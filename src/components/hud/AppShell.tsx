import { CornerBrackets } from "./CornerBrackets";
import { NavLinks } from "./NavLinks";
import { ThemeToggle } from "./ThemeToggle";
import { BackToTop } from "./BackToTop";
import { RelatedSites } from "./RelatedSites";
import { SitesMenu } from "./SitesMenu";
import styles from "./AppShell.module.css";

type AppShellProps = {
  children: React.ReactNode;
};

const NAV_ITEMS: { href: string; label: string }[] = [
  { href: "/basics", label: "アルゴリズムとは?" },
  { href: "/", label: "カタログ" },
  { href: "/atlas", label: "年表" },
  { href: "/compare", label: "比較" },
];

/** 使用頻度の低いページ。ヘッダーを 1 段に収めるため、メニューにまとめる。 */
const MORE_NAV_ITEMS: { href: string; label: string }[] = [
  { href: "/map", label: "依存の地図" },
  { href: "/updates", label: "更新情報" },
  { href: "/about", label: "About" },
];

/**
 * 全画面共通のHUDフレーム(docs/design/ui-design.md 2.6節・3節)。
 * ヘッダー(ブランド+ナビゲーション+関連サイトのメニュー+テーマ切替)とコーナーブラケットを提供する。
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className={styles.frame}>
      <CornerBrackets />
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandDot} aria-hidden="true" />
          <span className={styles.brandName}>
            <span className={styles.brandThe}>THE </span>ALGORITHM ILLUSTRATED
          </span>
          <span className={styles.brandSub}>
            状態分離型 インタラクティブ・アルゴリズム図鑑
          </span>
        </div>
        <NavLinks items={NAV_ITEMS} moreItems={MORE_NAV_ITEMS} />
        <div className={styles.headerRight}>
          <SitesMenu current="algorithm" />
          <ThemeToggle />
        </div>
      </header>
      <main className={styles.main}>{children}</main>
      <RelatedSites current="algorithm" />
      <BackToTop />
    </div>
  );
}
