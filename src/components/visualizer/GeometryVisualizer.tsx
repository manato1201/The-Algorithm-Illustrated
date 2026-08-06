"use client";

import { useEffect, useMemo, useRef } from "react";
import styles from "./GeometryVisualizer.module.css";
import { PlaybackControls } from "./PlaybackControls";
import { ZoomableStage } from "./ZoomableStage";
import { useStepPlayer } from "./useStepPlayer";
import { useWorkerFrames } from "./useWorkerFrames";
import { stateColors } from "@/lib/design-tokens";
import {
  GEOMETRY_DATASETS,
  type GeometryFrame,
  type GeometryPointState,
  type GeometrySegmentState,
} from "@/lib/geometry-visualizers";
import type { WorkerRequest } from "@/workers/algorithm-worker";

const POINT_COLORS: Record<GeometryPointState, string> = {
  idle: stateColors.idle,
  candidate: stateColors.comparing,
  hull: stateColors.settled,
  current: stateColors.pivot,
  rejected: stateColors.swapping,
  sweep: stateColors.pivot,
};

const SEGMENT_COLORS: Record<GeometrySegmentState, string> = {
  active: stateColors.pivot,
  final: stateColors.settled,
  rejected: stateColors.swapping,
};

const LEGEND_ITEMS: { key: GeometryPointState; label: string }[] = [
  { key: "candidate", label: "検討中の候補点" },
  { key: "hull", label: "確定した点" },
  { key: "current", label: "現在処理中の点" },
  { key: "rejected", label: "除外された点" },
];

type GeometryVisualizerProps = {
  algorithmId: string;
};

/** データセットの実際の座標範囲(境界ボックス)。手作業でレイアウトした点が[0,1]の想定範囲を
 * 超えていても、この境界ボックスをcanvasいっぱいに引き伸ばして描画することで見切れを防ぐ
 * (GraphVisualizerの見切れ修正と同じ設計を新規コンポーネントでは最初から組み込む)。 */
function computeBounds(points: { x: number; y: number }[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, maxX, minY, maxY };
}

/**
 * 2次元の点集合を扱う計算幾何アルゴリズムの可視化(凸包・三角形分割・走査線等)。
 * GraphVisualizerと違い、点の集合は固定データセット(GEOMETRY_DATASETS)だが、
 * 線分(辺)はアルゴリズムの進行に応じてフレームごとに動的に構築される。
 */
export function GeometryVisualizer({ algorithmId }: GeometryVisualizerProps) {
  const dataset = GEOMETRY_DATASETS[algorithmId];
  const bounds = useMemo(() => (dataset ? computeBounds(dataset.points) : null), [dataset]);
  const request = useMemo<WorkerRequest>(
    () => ({ kind: "geometry", algorithmId }),
    [algorithmId],
  );
  const { frames, isComputing } = useWorkerFrames<GeometryFrame>(request);
  const { stepIndex, isFinished, showPause, handlePlayPause, handleStep, reset } =
    useStepPlayer(frames.length);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const currentFrame = frames[stepIndex];
    if (!canvas || !currentFrame || !dataset || !bounds) return;
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

    const padding = 30;
    const spanX = Math.max(bounds.maxX - bounds.minX, 1e-6);
    const spanY = Math.max(bounds.maxY - bounds.minY, 1e-6);
    const usableW = Math.max(width - padding * 2, 1);
    const usableH = Math.max(height - padding * 2, 1);

    const pointById = new Map(dataset.points.map((p) => [p.id, p]));
    const project = (id: string) => {
      const p = pointById.get(id)!;
      const nx = (p.x - bounds.minX) / spanX;
      // y軸は数学座標系(下が原点)を画面座標系(下がheight)に反転させる。
      const ny = 1 - (p.y - bounds.minY) / spanY;
      return { x: padding + nx * usableW, y: padding + ny * usableH };
    };

    ctx.font = "11px var(--font-mono), monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const seg of currentFrame.segments) {
      const from = project(seg.from);
      const to = project(seg.to);
      const color = SEGMENT_COLORS[seg.state];
      ctx.strokeStyle = color;
      ctx.lineWidth = seg.state === "final" ? 2.5 : 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    for (const point of dataset.points) {
      const state = currentFrame.pointStates[point.id] ?? "idle";
      const color = POINT_COLORS[state];
      const { x, y } = project(point.id);
      const radius = state === "idle" ? 5 : 7;

      ctx.shadowColor = state === "idle" ? "transparent" : color;
      ctx.shadowBlur = state === "idle" ? 0 : 10;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
      ctx.fillText(point.id, x, y - radius - 8);
    }
  }, [frames, stepIndex, dataset, bounds]);

  if (!dataset) return null;

  const currentFrame = frames[stepIndex];

  return (
    <div className={styles.visualizer}>
      <ZoomableStage>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      </ZoomableStage>
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
              style={{ backgroundColor: POINT_COLORS[item.key] }}
              aria-hidden="true"
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
