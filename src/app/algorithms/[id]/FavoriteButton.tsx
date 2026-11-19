"use client";

import { FavoriteToggleButton } from "@/components/hud/FavoriteToggleButton";
import { useFavorites } from "@/lib/use-favorites";

/** 詳細ページヘッダー用のお気に入りボタン(状態はuseFavoritesで自己管理)。 */
export function FavoriteButton({
  id,
  variant = "label",
}: {
  id: string;
  variant?: "icon" | "label";
}) {
  const { favorites, isLoaded, toggleFavorite } = useFavorites();

  return (
    <FavoriteToggleButton
      variant={variant}
      active={favorites.has(id)}
      disabled={!isLoaded}
      onToggle={() => toggleFavorite(id)}
    />
  );
}
