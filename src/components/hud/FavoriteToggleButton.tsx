"use client";

import { useState } from "react";
import styles from "./FavoriteToggleButton.module.css";

type FavoriteToggleButtonProps = {
  active: boolean;
  onToggle: () => void;
  variant?: "icon" | "label";
  disabled?: boolean;
};

/**
 * お気に入りの星ボタン(見た目のみ)。状態の読み書きはuseFavorites側の責務で、
 * このコンポーネント自体はactive/onToggleを受け取るだけの表示専用コンポーネント。
 * カタログの一覧行(Linkの中に置かれる)ではクリックが行全体のナビゲーションと
 * 競合しないよう、ここでpreventDefault/stopPropagationする。
 */
export function FavoriteToggleButton({
  active,
  onToggle,
  variant = "icon",
  disabled = false,
}: FavoriteToggleButtonProps) {
  // 押して「追加」になった直後だけ星をはずませる(読み込み時にすでに登録済みの星は動かさない)。
  const [popped, setPopped] = useState(false);
  return (
    <button
      type="button"
      className={variant === "icon" ? styles.iconButton : styles.labelButton}
      data-active={active}
      data-pop={popped && active}
      aria-pressed={active}
      aria-label={active ? "お気に入りから外す" : "お気に入りに追加"}
      disabled={disabled}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setPopped(!active);
        onToggle();
      }}
    >
      <span aria-hidden="true">{active ? "★" : "☆"}</span>
      {variant === "label" ? "お気に入り" : null}
    </button>
  );
}
