"use client";

import { useEffect, useState } from "react";

/**
 * CSSメディアクエリの一致状態をReact stateとして購読する。
 * SSR時点ではwindowが無いため初期値はfalse(非一致)とし、マウント後のeffectで実際の値に更新する
 * (サーバー/クライアントの初回レンダリング結果を一致させ、hydration mismatchを避けるため)。
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);

    const update = () => setMatches(mql.matches);
    // react-hooks/set-state-in-effectを避けるため、初回反映のsetStateはtimeoutコールバック内で行う
    // (useStepPlayer.tsと同じ回避パターン)。
    const timer = setTimeout(update, 0);

    mql.addEventListener("change", update);
    return () => {
      clearTimeout(timer);
      mql.removeEventListener("change", update);
    };
  }, [query]);

  return matches;
}
