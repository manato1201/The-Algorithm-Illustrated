"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "./AppShell.module.css";

type NavItem = { href: string; label: string };

/**
 * ヘッダーのメインナビゲーション。選択中のページだけをピル(枠付き)で示す(IMPROVEMENT_DESIGN_2026-10 U2)。
 * アルゴリズム詳細(/algorithms/...)はカタログの一部として「カタログ」を選択中とみなす。
 *
 * ヘッダーを 1 段に収めるため、使用頻度の低いページ(`moreItems`)はメニューにまとめる。
 * 狭い画面では、主要なページもメニューへ畳む(主要ページの横並びは CSS で隠し、メニュー内の項目を出す)。
 */
export function NavLinks({
  items,
  moreItems,
}: {
  items: NavItem[];
  moreItems: NavItem[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  const rootRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string): boolean => {
    if (href === "/")
      return pathname === "/" || pathname.startsWith("/algorithms/");
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // ページを移動したらメニューを閉じる
  const menuOpen = open && openedAt === pathname;

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const moreActive = moreItems.some((item) => isActive(item.href));

  const renderLink = (item: NavItem, extraClass = "") => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`${styles.navLink} ${active ? styles.navLinkActive : ""} ${extraClass}`}
        aria-current={active ? "page" : undefined}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <div className={styles.navRoot} ref={rootRef}>
      <nav className={styles.nav} aria-label="メインナビゲーション">
        {items.map((item) => renderLink(item, styles.navPrimary))}
        <button
          type="button"
          className={`${styles.navLink} ${styles.menuButton} ${
            moreActive ? styles.navLinkActive : ""
          }`}
          aria-expanded={menuOpen}
          aria-controls="nav-more-menu"
          onClick={() => {
            setOpenedAt(pathname);
            setOpen(!menuOpen);
          }}
        >
          <span className={styles.menuLabelWide}>その他</span>
          <span className={styles.menuLabelNarrow}>MENU</span>
          <span aria-hidden="true" className={styles.menuCaret}>
            ▾
          </span>
        </button>
      </nav>
      {menuOpen ? (
        <div className={styles.menu} id="nav-more-menu">
          {items.map((item) => renderLink(item, styles.menuPrimaryItem))}
          {moreItems.map((item) => renderLink(item))}
        </div>
      ) : null}
    </div>
  );
}
