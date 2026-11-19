"use client";

import { useEffect, useRef, useState } from "react";
import { RELATED_SITES, type SiteId } from "./RelatedSites";
import styles from "./AppShell.module.css";

/**
 * ヘッダーの「関連サイト」メニュー。フッターまで行かなくても、自作の姉妹サイトへ飛べる。
 * 一覧は RelatedSites.tsx の RELATED_SITES を共有する(定義は 1 か所)。いま見ているサイトはリンクにしない。
 * 操作: ボタンで開閉・Esc で閉じてボタンへ戻る・外側のクリックで閉じる・↑↓ で項目を移動・Tab でも順に辿れる。
 */
export function SitesMenu({ current }: { current: SiteId }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const links = Array.from(
        rootRef.current?.querySelectorAll<HTMLElement>("a[href]") ?? [],
      );
      if (links.length === 0) return;
      event.preventDefault();
      const index = links.indexOf(document.activeElement as HTMLElement);
      const step = event.key === "ArrowDown" ? 1 : -1;
      links[(index + step + links.length) % links.length].focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.sitesRoot} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.navLink} ${styles.menuButton}`}
        aria-expanded={open}
        aria-controls="sites-menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.sitesLabelWide}>関連サイト</span>
        <span className={styles.sitesLabelNarrow}>サイト</span>
        <span aria-hidden="true">▾</span>
      </button>
      {open ? (
        <ul className={`${styles.menu} ${styles.sitesMenu}`} id="sites-menu">
          {RELATED_SITES.map((site) => (
            <li key={site.id}>
              {site.id === current ? (
                <span className={styles.siteItem} aria-current="true">
                  <span className={styles.siteName}>{site.name}</span>
                  <span className={styles.siteDesc}>いま見ているサイト</span>
                </span>
              ) : site.url ? (
                <a className={`${styles.siteItem} ${styles.siteLink}`} href={site.url} rel="noopener">
                  <span className={styles.siteName}>{site.name}</span>
                  <span className={styles.siteDesc}>{site.desc}</span>
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
