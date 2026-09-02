"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "algo-illustrated:favorites";

function readFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function writeFavorites(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // プライベートブラウジング等でlocalStorageが使えない場合は何もしない(お気に入りは保存されないだけ)
  }
}

/**
 * お気に入りアルゴリズムのID集合をlocalStorageで管理するフック。
 * SSR時点ではlocalStorageが存在しないため初期値は空集合とし、マウント後のeffectで読み込む
 * (サーバー/クライアントの初回レンダリング結果を一致させ、hydration mismatchを避けるため)。
 * storageイベントを購読し、同一ブラウザの別タブでの変更にも追従する。
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // react-hooks/set-state-in-effectを避けるため、初回読み込みのsetStateはtimeoutコールバック内で行う
    // (useStepPlayer.tsと同じ回避パターン)。
    const timer = setTimeout(() => {
      setFavorites(new Set(readFavorites()));
      setIsLoaded(true);
    }, 0);

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setFavorites(new Set(readFavorites()));
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      writeFavorites([...next]);
      return next;
    });
  }, []);

  return { favorites, isLoaded, toggleFavorite };
}
