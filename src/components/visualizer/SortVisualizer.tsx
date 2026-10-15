"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./SortVisualizer.module.css";
import { PlaybackControls } from "./PlaybackControls";
import { buildStepKinds, highlightEntities } from "./step-timeline";
import { ZoomableStage } from "./ZoomableStage";
import { useStepPlayer } from "./useStepPlayer";
import { useWorkerFrames } from "./useWorkerFrames";
import { ParticleBurstLayer, type ParticleBurst } from "./ParticleBurstLayer";
import { shouldGlow, stateColors, type StateColorKey } from "@/lib/design-tokens";
import type { SortFrame } from "@/lib/sort-visualizers";
import { useMediaQuery } from "@/lib/use-media-query";
import type { WorkerRequest } from "@/workers/algorithm-worker";

const INITIAL_ARRAY = [
  62, 11, 88, 34, 5, 77, 23, 45, 90, 8, 56, 41, 19, 68, 3, 82, 30, 71, 15, 59,
];

/** 要素数ステッパーの範囲。全ソートがこの範囲の長さで正しく動くことは npm run verify で確認している。 */
const MIN_ELEMENTS = 4;
const MAX_ELEMENTS = 30;

/**
 * 指定した要素数の入力配列を作る。既定の20個は従来の配列をそのまま使い、それ以外は
 * 「1..nを等間隔に並べた値」を固定シードの擬似乱数でシャッフルする(毎回同じ並びで再現できる)。
 */
function buildSeedArray(count: number): number[] {
  if (count === INITIAL_ARRAY.length) return [...INITIAL_ARRAY];
  const values = Array.from({ length: count }, (_, i) => Math.round(((i + 1) * 100) / count));
  let state = 2463534242 + count;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

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
 * ステップ列の生成はWeb Worker(algorithm-worker.ts)に委譲し、メインスレッドは受け取ったフレームの再生・描画のみを担う。
 * ただしdiffベースの状態記録・IndexedDBキャッシュは未実装のクライアント側簡易実装(docs/progress.md参照)。
 */
export function SortVisualizer({ algorithmId }: SortVisualizerProps) {
  const [seedArray, setSeedArray] = useState<number[]>(INITIAL_ARRAY);
  const [onionSkin, setOnionSkin] = useState(false);
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const request = useMemo<WorkerRequest>(
    () => ({ kind: "sort", algorithmId, input: seedArray }),
    [algorithmId, seedArray],
  );
  const { frames, isComputing } = useWorkerFrames<SortFrame>(request);
  const { stepIndex, isFinished, showPause, speed, setSpeed, handlePlayPause, handleStep, handleScrub, reset } =
    useStepPlayer(frames.length);
  const stepKinds = useMemo(() => buildStepKinds(frames, highlightEntities), [frames]);
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

    // 残像: 直前のステップの棒を、輪郭だけ薄く残す(動きを減らす設定では出さない)
    const previousFrame = frames[stepIndex - 1];
    if (onionSkin && !reduceMotion && previousFrame && previousFrame.array.length === n) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      previousFrame.array.forEach((value, index) => {
        const ghostHeight = (value / maxValue) * (height - 24);
        const ghostX = index * (barWidth + gap);
        ctx.strokeStyle = stateColors[previousFrame.highlight[index] ?? "idle"];
        ctx.strokeRect(ghostX + 0.5, height - floorPadding - ghostHeight + 0.5, barWidth - 1, ghostHeight - 1);
      });
      ctx.restore();
    }

    values.forEach((value, index) => {
      const barHeight = (value / maxValue) * (height - 24);
      const x = index * (barWidth + gap);
      const y = height - floorPadding - barHeight;
      const state = currentFrame.highlight[index] ?? "idle";
      const color = stateColors[state];

      ctx.shadowColor = shouldGlow(color) ? color : "transparent";
      ctx.shadowBlur = shouldGlow(color) ? 14 : 0;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, barWidth, barHeight);
    });
  }, [frames, stepIndex, onionSkin, reduceMotion]);

  const bursts = useMemo<ParticleBurst[]>(() => {
    const currentFrame = frames[stepIndex];
    if (!currentFrame) return [];
    const previousFrame = frames[stepIndex - 1];
    const n = currentFrame.array.length;
    const result: ParticleBurst[] = [];

    for (let index = 0; index < n; index++) {
      const state = currentFrame.highlight[index];
      const previousState = previousFrame?.highlight[index];
      if (state === "swapping") {
        result.push({
          id: `${stepIndex}-${index}-swap`,
          xRatio: (index + 0.5) / n,
          yRatio: 0.55,
          color: stateColors.swapping,
        });
      } else if (state === "settled" && previousState !== "settled") {
        result.push({
          id: `${stepIndex}-${index}-settled`,
          xRatio: (index + 0.5) / n,
          yRatio: 0.3,
          color: stateColors.settled,
        });
      }
    }
    return result;
  }, [frames, stepIndex]);

  const handleElementCount = useCallback(
    (count: number) => {
      const clamped = Math.min(MAX_ELEMENTS, Math.max(MIN_ELEMENTS, count));
      reset();
      setSeedArray(buildSeedArray(clamped));
    },
    [reset],
  );

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

  const currentFrame = frames[stepIndex];

  return (
    <div className={styles.visualizer}>
      <ZoomableStage>
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
        onReset={handleShuffle}
        resetLabel="シャッフル"
        onionSkin={{ enabled: onionSkin, onChange: setOnionSkin }}
        stepper={{
          label: "要素数",
          value: seedArray.length,
          min: MIN_ELEMENTS,
          max: MAX_ELEMENTS,
          onChange: handleElementCount,
        }}
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
