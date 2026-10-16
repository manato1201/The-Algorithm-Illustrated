"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./SearchVisualizer.module.css";
import { PlaybackControls } from "./PlaybackControls";
import { buildStepKinds, highlightEntities } from "./step-timeline";
import { ZoomableStage } from "./ZoomableStage";
import { useStepPlayer } from "./useStepPlayer";
import { useFrameTween } from "./useFrameTween";
import { useWorkerFrames } from "./useWorkerFrames";
import { ParticleBurstLayer, type ParticleBurst } from "./ParticleBurstLayer";
import { shouldGlow, stateColors, type StateColorKey } from "@/lib/design-tokens";
import { SEARCH_TARGET, type SearchFrame } from "@/lib/search-visualizers";
import { lerp, mixColor } from "@/lib/color-mix";
import { useMediaQuery } from "@/lib/use-media-query";
import type { WorkerRequest } from "@/workers/algorithm-worker";

const LEGEND_ITEMS: { key: StateColorKey; label: string }[] = [
  { key: "idle", label: "未検査" },
  { key: "comparing", label: "検査中" },
  { key: "pivot", label: "現在の候補位置" },
  { key: "settled", label: "発見" },
];

/** SEARCH_TARGET(検索対象の値)を実際に使う「探索」系アルゴリズムのみ、その値をラベル表示する。 */
const TARGET_SEARCH_ALGORITHMS = new Set([
  "linear-search",
  "binary-search",
  "ternary-search",
  "jump-search",
  "interpolation-search",
  "exponential-search",
  "fibonacci-search",
]);

/** stateColors.swapping(通常は「交換中」の意味)を別の意味で使うアルゴリズムの凡例ラベル。 */
const SWAPPING_LEGEND_LABEL: Partial<Record<string, string>> = {
  "sieve-of-eratosthenes": "合成数(篩い落とし済み)",
  "bloom-filter": "確実に未追加、または偽陽性",
  "tabu-search": "タブー(直近訪問済み、移動禁止)",
};

type SearchVisualizerProps = {
  algorithmId: string;
};

/**
 * ソート済み(あるいは線形探索の場合は任意の)配列に対する検索アルゴリズムの可視化。
 * SortVisualizerと同じバーチャート描画・状態パレットを流用しつつ、
 * シャッフル操作は持たない(探索対象の配列・値は固定)。
 */
export function SearchVisualizer({ algorithmId }: SearchVisualizerProps) {
  const request = useMemo<WorkerRequest>(() => ({ kind: "search", algorithmId }), [algorithmId]);
  const { frames, isComputing } = useWorkerFrames<SearchFrame>(request);
  const { stepIndex, isFinished, showPause, speed, setSpeed, handlePlayPause, handleStep, handleScrub, reset } =
    useStepPlayer(frames.length);
  const stepKinds = useMemo(() => buildStepKinds(frames, highlightEntities), [frames]);
  const tween = useFrameTween(stepIndex, speed);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [onionSkin, setOnionSkin] = useState(false);
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    const canvas = canvasRef.current;
    const currentFrame = frames[stepIndex];
    if (!canvas || !currentFrame) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const values = currentFrame.array;
    const n = values.length;
    const gap = 4;
    const barWidth = (width - gap * (n - 1)) / n;
    const floorPadding = 4;
    const usableHeight = height - 24;
    /** 負の値(カダンのアルゴリズム等)にも対応するため、0を基準線としたスケールで描画する。 */
    const minValue = Math.min(0, ...values);
    const maxValue = Math.max(0, ...values);
    const range = maxValue - minValue || 1;
    const yFor = (value: number) =>
      height - floorPadding - ((value - minValue) / range) * usableHeight;
    const zeroY = yFor(0);

    // 残像: 直前のステップの棒を、輪郭だけ薄く残す(動きを減らす設定では出さない)
    const previousFrame = frames[stepIndex - 1];
    if (onionSkin && !reduceMotion && previousFrame && previousFrame.array.length === n) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      previousFrame.array.forEach((value, index) => {
        const ghostY = yFor(value);
        const ghostTop = Math.min(ghostY, zeroY);
        const ghostHeight = Math.abs(zeroY - ghostY);
        ctx.strokeStyle = stateColors[previousFrame.highlight[index] ?? "idle"];
        ctx.strokeRect(index * (barWidth + gap) + 0.5, ghostTop + 0.5, barWidth - 1, Math.max(ghostHeight - 1, 0));
      });
      ctx.restore();
    }

    const fromFrame = frames[tween.from];
    const canTween = fromFrame !== undefined && fromFrame.array.length === n;

    values.forEach((value, index) => {
      const targetY = yFor(value);
      const x = index * (barWidth + gap);
      const state = currentFrame.highlight[index] ?? "idle";
      const targetColor = stateColors[state];

      let valueY = targetY;
      let color: string = targetColor;
      if (canTween) {
        valueY = lerp(yFor(fromFrame.array[index]), targetY, tween.t);
        color = mixColor(stateColors[fromFrame.highlight[index] ?? "idle"], targetColor, tween.t);
      }
      const rectTop = Math.min(valueY, zeroY);
      const rectHeight = Math.abs(zeroY - valueY);

      ctx.shadowColor = shouldGlow(targetColor) ? targetColor : "transparent";
      ctx.shadowBlur = shouldGlow(targetColor) ? 14 * tween.t : 0;
      ctx.fillStyle = color;
      ctx.fillRect(x, rectTop, barWidth, rectHeight);
    });
  }, [frames, stepIndex, onionSkin, reduceMotion, tween.from, tween.t]);

  const bursts = useMemo<ParticleBurst[]>(() => {
    const currentFrame = frames[stepIndex];
    if (!currentFrame) return [];
    const n = currentFrame.array.length;
    const result: ParticleBurst[] = [];
    for (let index = 0; index < n; index++) {
      if (currentFrame.highlight[index] === "settled") {
        result.push({
          id: `${stepIndex}-${index}-found`,
          xRatio: (index + 0.5) / n,
          yRatio: 0.3,
          color: stateColors.settled,
        });
      }
    }
    return result;
  }, [frames, stepIndex]);

  const currentFrame = frames[stepIndex];

  return (
    <div className={styles.visualizer}>
      {TARGET_SEARCH_ALGORITHMS.has(algorithmId) ? (
        <p className={styles.target}>検索対象の値: {SEARCH_TARGET}</p>
      ) : null}
      <ZoomableStage hud={{ kind: stepKinds[stepIndex] ?? "idle", step: stepIndex, total: frames.length }}>
        <div className={styles.canvasWrap}>
          <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
          <ParticleBurstLayer bursts={bursts} />
        </div>
      </ZoomableStage>
      <p className={styles.description} role="status">
        {isComputing ? "Web Workerで計算中…" : currentFrame?.description}
      </p>
      <PlaybackControls
        stepIndex={stepIndex}
        frameCount={frames.length}
        showPause={showPause}
        isFinished={isFinished}
        speed={speed}
        stepKinds={stepKinds}
        onPlayPause={handlePlayPause}
        onStep={handleStep}
        onScrub={handleScrub}
        onSpeedChange={setSpeed}
        onReset={reset}
        resetLabel="最初から"
        onionSkin={{ enabled: onionSkin, onChange: setOnionSkin }}
      />
      <ul className={styles.legend}>
        {LEGEND_ITEMS.map((item) => (
          <li key={item.key} className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ backgroundColor: stateColors[item.key] }}
              aria-hidden="true"
            />
            {item.label}
          </li>
        ))}
        {SWAPPING_LEGEND_LABEL[algorithmId] ? (
          <li className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ backgroundColor: stateColors.swapping }}
              aria-hidden="true"
            />
            {SWAPPING_LEGEND_LABEL[algorithmId]}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
