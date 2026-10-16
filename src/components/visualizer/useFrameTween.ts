"use client";

import { useEffect, useState } from "react";
import { easeOutCubic } from "@/lib/color-mix";
import { useMediaQuery } from "@/lib/use-media-query";

/** 1ステップの補間にかける最大の長さ。再生が速いときは、間隔の7割までに縮める。 */
const MAX_TWEEN_MS = 260;
const BASE_INTERVAL_MS = 400;

type TweenState = { step: number; progress: number };

/**
 * ステップ間の見た目を滑らかに補間するための値を返す(視覚表現の強化)。
 * - from: 補間の起点にするフレーム番号(直前に表示していたステップ。巻き戻しでも「見えていたもの」から動く)
 * - t: 0→1のイーズ済みの進行度。描画側は frames[from] と frames[stepIndex] を t で混ぜる
 * 動きを減らす設定(prefers-reduced-motion)では、補間せず常に t=1(切り替えのみ)。
 * 描画のたびにsetStateするのはrAFコールバック内だけで、effect本体では直接setStateしない。
 */
export function useFrameTween(
  stepIndex: number,
  speed: number,
): { from: number; t: number } {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [state, setState] = useState<TweenState>({
    step: stepIndex,
    progress: 1,
  });
  const durationMs = Math.min(MAX_TWEEN_MS, (BASE_INTERVAL_MS / speed) * 0.7);

  useEffect(() => {
    if (reduceMotion) return;
    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      setState({ step: stepIndex, progress });
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [stepIndex, durationMs, reduceMotion]);

  if (reduceMotion) return { from: stepIndex, t: 1 };
  // 新しいステップのeffectがまだ走っていない描画では、直前のステップから始める(t=0)
  if (state.step !== stepIndex) return { from: state.step, t: 0 };
  return { from: stepIndex, t: easeOutCubic(state.progress) };
}
