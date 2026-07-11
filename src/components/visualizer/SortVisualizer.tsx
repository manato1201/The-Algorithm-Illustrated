"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./SortVisualizer.module.css";
import { stateColors, type StateColorKey } from "@/lib/design-tokens";
import { SORT_VISUALIZERS } from "@/lib/sort-visualizers";

const INITIAL_ARRAY = [
  62, 11, 88, 34, 5, 77, 23, 45, 90, 8, 56, 41, 19, 68, 3, 82, 30, 71, 15, 59,
];
const PLAY_INTERVAL_MS = 400;

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
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isPlaying || stepIndex >= frames.length - 1) return;
    const timer = setTimeout(() => {
      setStepIndex((i) => Math.min(i + 1, frames.length - 1));
    }, PLAY_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [isPlaying, stepIndex, frames.length]);

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

  const handlePlayPause = useCallback(() => {
    if (stepIndex >= frames.length - 1) {
      setStepIndex(0);
      setIsPlaying(true);
      return;
    }
    setIsPlaying((playing) => !playing);
  }, [stepIndex, frames.length]);

  const handleStep = useCallback(
    (delta: number) => {
      setIsPlaying(false);
      setStepIndex((i) => Math.min(Math.max(i + delta, 0), frames.length - 1));
    },
    [frames.length],
  );

  const handleShuffle = useCallback(() => {
    setIsPlaying(false);
    setStepIndex(0);
    setSeedArray((current) => {
      const next = [...current];
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
  }, []);

  if (!generate) return null;

  const isFinished = stepIndex >= frames.length - 1;
  const currentFrame = frames[Math.min(stepIndex, frames.length - 1)];
  const showPause = isPlaying && !isFinished;

  return (
    <div className={styles.visualizer}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <p className={styles.description} role="status">
        {currentFrame?.description}
      </p>
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.button}
          onClick={() => handleStep(-1)}
          disabled={stepIndex === 0}
        >
          ← 戻る
        </button>
        <button type="button" className={styles.buttonPrimary} onClick={handlePlayPause}>
          {showPause ? "一時停止" : isFinished ? "最初から再生" : "再生"}
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={() => handleStep(1)}
          disabled={isFinished}
        >
          進む →
        </button>
        <button type="button" className={styles.button} onClick={handleShuffle}>
          シャッフル
        </button>
        <span className={styles.stepCount}>
          STEP {stepIndex + 1} / {frames.length}
        </span>
      </div>
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
