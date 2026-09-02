"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "algo-illustrated:recent";
const MAX_HISTORY = 8;

function readRecent(): string[] {
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

/**
 * アルゴリズム詳細ページの閲覧を「最近見た」履歴の先頭に記録する。
 * 既に履歴にあるIDは一旦取り除いてから先頭に積み直す(＝最新の閲覧順に並び替え)。
 * MAX_HISTORY件を超えた古いものは切り捨てる。
 */
export function recordRecentlyViewed(id: string) {
  if (typeof window === "undefined") return;
  try {
    const deduped = readRecent().filter((existing) => existing !== id);
    const next = [id, ...deduped].slice(0, MAX_HISTORY);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // プライベートブラウジング等でlocalStorageが使えない場合は何もしない(履歴が残らないだけ)
  }
}

/** カタログ画面で「最近見た」一覧を表示するためのフック。新しい順のID配列を返す。 */
export function useRecentlyViewed(): string[] {
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    // react-hooks/set-state-in-effectを避けるため、初回読み込みのsetStateはtimeoutコールバック内で行う
    // (useStepPlayer.tsと同じ回避パターン)。
    const timer = setTimeout(() => {
      setRecentIds(readRecent());
    }, 0);

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setRecentIds(readRecent());
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return recentIds;
}
