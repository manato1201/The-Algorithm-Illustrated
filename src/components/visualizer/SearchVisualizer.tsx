"use client";

import { useEffect, useMemo, useRef } from "react";
import styles from "./SearchVisualizer.module.css";
import { PlaybackControls } from "./PlaybackControls";
import { useStepPlayer } from "./useStepPlayer";
import { useWorkerFrames } from "./useWorkerFrames";
import { ParticleBurstLayer, type ParticleBurst } from "./ParticleBurstLayer";
import { stateColors, type StateColorKey } from "@/lib/design-tokens";
import { SEARCH_TARGET, type SearchFrame } from "@/lib/search-visualizers";
import type { WorkerRequest } from "@/workers/algorithm-worker";

const LEGEND_ITEMS: { key: StateColorKey; label: string }[] = [
  { key: "idle", label: "未検査" },
  { key: "comparing", label: "検査中" },
  { key: "pivot", label: "現在の候補位置" },
  { key: "settled", label: "発見" },
];

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
  const { stepIndex, isFinished, showPause, handlePlayPause, handleStep, reset } =
    useStepPlayer(frames.length);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    const maxValue = Math.max(...values);
    const floorPadding = 4;

    values.forEach((value, index) => {
      const barHeight = (value / maxValue) * (height - 24);
      const x = index * (barWidth + gap);
      const y = height - floorPadding - barHeight;
      const state = currentFrame.highlight[index] ?? "idle";
      const color = stateColors[state];

      ctx.shadowColor = state === "idle" ? "transparent" : color;
      ctx.shadowBlur = state === "idle" ? 0 : 14;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, barWidth, barHeight);
    });
  }, [frames, stepIndex]);

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
      <p className={styles.target}>検索対象の値: {SEARCH_TARGET}</p>
      <div className={styles.canvasWrap}>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        <ParticleBurstLayer bursts={bursts} />
      </div>
      <p className={styles.description} role="status">
        {isComputing ? "Web Workerで計算中…" : currentFrame?.description}
      </p>
      <PlaybackControls
        stepIndex={stepIndex}
        frameCount={frames.length}
        showPause={showPause}
        isFinished={isFinished}
        onPlayPause={handlePlayPause}
        onStep={handleStep}
        onReset={reset}
        resetLabel="最初から"
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
      </ul>
    </div>
  );
}
