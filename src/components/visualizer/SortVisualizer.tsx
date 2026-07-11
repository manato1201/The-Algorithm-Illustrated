"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./SortVisualizer.module.css";
import { PlaybackControls } from "./PlaybackControls";
import { useStepPlayer } from "./useStepPlayer";
import { stateColors, type StateColorKey } from "@/lib/design-tokens";
import { SORT_VISUALIZERS } from "@/lib/sort-visualizers";

const INITIAL_ARRAY = [
  62, 11, 88, 34, 5, 77, 23, 45, 90, 8, 56, 41, 19, 68, 3, 82, 30, 71, 15, 59,
];

const LEGEND_ITEMS: { key: StateColorKey; label: string }[] = [
  { key: "idle", label: "未処理" },
  { key: "comparing", label: "比較中" },
  { key: "swapping", label: "交換中" },
  { key: "pivot", label: "基準/ポインタ" },
  { key: "settled", label: "確定" },
];

type SortVisualizerProps = {
  algorithmId: string;
};

/**
 * 状態遷移の可視化(ui-design.md 3節#2「主戦場」、5節のショーケースティア領域)。
 * Web Worker/diffベースの状態記録は未実装のため、現状はクライアント側で全ステップを事前生成して再生する簡易実装。
 */
export function SortVisualizer({ algorithmId }: SortVisualizerProps) {
  const generate = SORT_VISUALIZERS[algorithmId];
  const [seedArray, setSeedArray] = useState<number[]>(INITIAL_ARRAY);
  const frames = useMemo(
    () => (generate ? generate(seedArray) : []),
    [generate, seedArray],
  );
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

  const handleShuffle = useCallback(() => {
    reset();
    setSeedArray((current) => {
      const next = [...current];
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
  }, [reset]);

  if (!generate) return null;

  const currentFrame = frames[stepIndex];

  return (
    <div className={styles.visualizer}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <p className={styles.description} role="status">
        {currentFrame?.description}
      </p>
      <PlaybackControls
        stepIndex={stepIndex}
        frameCount={frames.length}
        showPause={showPause}
        isFinished={isFinished}
        onPlayPause={handlePlayPause}
        onStep={handleStep}
        onReset={handleShuffle}
        resetLabel="シャッフル"
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
