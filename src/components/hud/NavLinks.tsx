"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AppShell.module.css";

type NavItem = { href: string; label: string };

/**
 * ヘッダーのメインナビゲーション。選択中のページだけをピル(枠付き)で示す(IMPROVEMENT_DESIGN_2026-10 U2)。
 * アルゴリズム詳細(/algorithms/...)はカタログの一部として「カタログ」を選択中とみなす。
 */
export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  const isActive = (href: string): boolean => {
    if (href === "/")
      return pathname === "/" || pathname.startsWith("/algorithms/");
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav className={styles.nav} aria-label="メインナビゲーション">
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
