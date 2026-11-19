"use client";

import { useEffect, useRef } from "react";
import styles from "./CategorySidebar.module.css";
import { useMediaQuery } from "@/lib/use-media-query";

export type SidebarSubcategory = { name: string; count: number };
export type SidebarCategory = {
  name: string;
  count: number;
  subcategories: SidebarSubcategory[];
};
export type SidebarGroup = { label: string; categories: SidebarCategory[] };

type CategorySidebarProps = {
  groups: SidebarGroup[];
  activeCategory: string | null;
  activeSubcategory: string | null;
  /** カテゴリ・サブカテゴリを選ぶ。どちらも null は「すべて」。 */
  onSelect: (category: string | null, subcategory: string | null) => void;
  /** 「すべて」の件数(絞り込みの条件を反映した全体の件数)。 */
  totalCount: number;
  /** モバイル(639px 以下)で一覧シートを開いているか。デスクトップでは使わない。 */
  sheetOpen: boolean;
  onSheetOpenChange: (open: boolean) => void;
};

const FOCUSABLE = "button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])";

/**
 * カタログのカテゴリ・サイドバー。
 * - デスクトップ: 左の sticky の列。大分類(CATEGORY_GROUPS)ごとにカテゴリを件数つきで並べ、選んだカテゴリだけサブカテゴリを展開する。
 * - モバイル(639px 以下): 同じ一覧を下からのシートにする。開くボタンは CategorySheetTrigger(検索窓の横に置く)。閉じる・Esc・背景タップで閉じる。
 * 1 つの要素を CSS だけで切り替えるので、画面幅が変わっても状態は 1 つ。カテゴリ名は持たず、groups を受け取って並べるだけ。
 */
export function CategorySidebar({
  groups,
  activeCategory,
  activeSubcategory,
  onSelect,
  totalCount,
  sheetOpen,
  onSheetOpenChange,
}: CategorySidebarProps) {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = isMobile && sheetOpen;

  // シートを開いている間: フォーカスを中へ移し、Esc で閉じ、Tab を中に留める。閉じたらフォーカスを元へ戻す
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onSheetOpenChange(false);
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [open, onSheetOpenChange]);

  // 選択中のカテゴリが一覧の外にあるときだけ、一覧の中を動かして見える位置へ(ページ全体はスクロールしない)
  useEffect(() => {
    const panel = panelRef.current;
    const active = panel?.querySelector<HTMLElement>('[data-active="true"]');
    if (!panel || !active) return;
    const top = active.offsetTop;
    if (top < panel.scrollTop || top + active.offsetHeight > panel.scrollTop + panel.clientHeight) {
      panel.scrollTop = Math.max(0, top - panel.clientHeight / 3);
    }
  }, [activeCategory]);

  const closeSheet = () => onSheetOpenChange(false);

  const handleCategory = (name: string, hasSubcategories: boolean) => {
    if (activeCategory === name && activeSubcategory === null) {
      onSelect(null, null);
      return;
    }
    onSelect(name, null);
    // サブカテゴリが無いカテゴリは、選んだ時点で一覧へ戻る。ある場合は続けて選べるよう開いたままにする
    if (!hasSubcategories) closeSheet();
  };

  const handleSubcategory = (category: string, name: string) => {
    onSelect(category, activeSubcategory === name ? null : name);
    closeSheet();
  };

  const allActive = activeCategory === null;

  return (
    <>
      <div
        className={styles.backdrop}
        data-open={open}
        onClick={closeSheet}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className={styles.panel}
        data-open={open}
        role={isMobile ? "dialog" : "complementary"}
        aria-modal={isMobile ? true : undefined}
        aria-label="カテゴリ"
        id="category-panel"
      >
        <div className={styles.head}>
          <h2 className={styles.title}>■ CATEGORY カテゴリ</h2>
          <button type="button" className={styles.close} ref={closeRef} onClick={closeSheet}>
            閉じる
          </button>
        </div>
        <nav aria-label="カテゴリで絞り込む">
          <button
            type="button"
            className={styles.row}
            data-active={allActive}
            aria-pressed={allActive}
            onClick={() => {
              onSelect(null, null);
              closeSheet();
            }}
          >
            <span>すべて</span>
            <span className={styles.count}>{totalCount}</span>
          </button>
          {groups.length === 0 ? (
            <p className={styles.empty}>表示できるカテゴリがありません。</p>
          ) : (
            groups.map((group) => (
              <section key={group.label} className={styles.group} aria-label={group.label}>
                <h3 className={styles.groupLabel}>{group.label}</h3>
                <ul className={styles.list}>
                  {group.categories.map((category) => {
                    const selected = activeCategory === category.name;
                    const expanded = selected && category.subcategories.length > 0;
                    return (
                      <li key={category.name}>
                        <button
                          type="button"
                          className={styles.row}
                          data-active={selected}
                          data-dim={category.count === 0 && !selected}
                          aria-pressed={selected}
                          aria-expanded={category.subcategories.length > 0 ? expanded : undefined}
                          disabled={category.count === 0 && !selected}
                          onClick={() => handleCategory(category.name, category.subcategories.length > 0)}
                        >
                          <span>{category.name}</span>
                          <span className={styles.count}>{category.count}</span>
                        </button>
                        {expanded ? (
                          <ul className={styles.subList} aria-label={`${category.name}のサブカテゴリ`}>
                            {category.subcategories.map((sub) => {
                              const subSelected = activeSubcategory === sub.name;
                              return (
                                <li key={sub.name}>
                                  <button
                                    type="button"
                                    className={`${styles.row} ${styles.subRow}`}
                                    data-active={subSelected}
                                    data-dim={sub.count === 0 && !subSelected}
                                    aria-pressed={subSelected}
                                    disabled={sub.count === 0 && !subSelected}
                                    onClick={() => handleSubcategory(category.name, sub.name)}
                                  >
                                    <span>{sub.name}</span>
                                    <span className={styles.count}>{sub.count}</span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </nav>
      </div>
    </>
  );
}

/** モバイル用の「カテゴリ」ボタン(検索窓の横に置く)。639px を超える画面では CSS で隠す。 */
export function CategorySheetTrigger({
  activeLabel,
  open,
  onClick,
}: {
  activeLabel: string | null;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.trigger}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls="category-panel"
      onClick={onClick}
    >
      <span className={styles.triggerLabel}>カテゴリ</span>
      <span className={styles.triggerValue}>{activeLabel ?? "すべて"}</span>
      <span aria-hidden="true">▾</span>
    </button>
  );
}
