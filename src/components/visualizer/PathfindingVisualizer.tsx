"use client";

import { useEffect, useMemo, useRef } from "react";
import styles from "./PathfindingVisualizer.module.css";
import { PlaybackControls } from "./PlaybackControls";
import { useStepPlayer } from "./useStepPlayer";
import { useWorkerFrames } from "./useWorkerFrames";
import { coreColors, stateColors } from "@/lib/design-tokens";
import { MAZE_COLS, MAZE_ROWS, type GridCellState, type GridFrame } from "@/lib/pathfinding-visualizers";
import type { WorkerRequest } from "@/workers/algorithm-worker";

const CELL_COLORS: Record<GridCellState, string> = {
  idle: stateColors.idle,
  wall: coreColors.bgSurface2,
  start: coreColors.accentAmber,
  goal: coreColors.accentGreen,
  frontier: stateColors.pivot,
  visited: stateColors.comparing,
  path: stateColors.settled,
};

const LEGEND_ITEMS: { key: GridCellState; label: string }[] = [
  { key: "start", label: "スタート" },
  { key: "goal", label: "ゴール" },
  { key: "frontier", label: "次の候補" },
  { key: "visited", label: "探索済み" },
  { key: "path", label: "最短経路" },
  { key: "wall", label: "壁" },
];

type PathfindingVisualizerProps = {
  algorithmId: string;
};

/**
 * グリッド上の経路探索(BFS/DFS)の可視化。ステップ列の生成はWeb Workerに委譲する。
 * SortVisualizerと同じuseStepPlayer/PlaybackControls/useWorkerFramesを共用する。
 * データはfixedな迷路(pathfinding-visualizers.ts)を1回だけ辿るため、シャッフルに相当する操作はない。
 */
export function PathfindingVisualizer({ algorithmId }: PathfindingVisualizerProps) {
  const request = useMemo<WorkerRequest>(
    () => ({ kind: "pathfinding", algorithmId }),
    [algorithmId],
  );
  const { frames, isComputing } = useWorkerFrames<GridFrame>(request);
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

    const gap = 3;
    const cellWidth = (width - gap * (MAZE_COLS - 1)) / MAZE_COLS;
    const cellHeight = (height - gap * (MAZE_ROWS - 1)) / MAZE_ROWS;

    currentFrame.cellStates.forEach((row, r) => {
      row.forEach((state, c) => {
        const x = c * (cellWidth + gap);
        const y = r * (cellHeight + gap);
        const color = CELL_COLORS[state];
        const isDynamic = state === "frontier" || state === "visited" || state === "path";

        ctx.shadowColor = isDynamic ? color : "transparent";
        ctx.shadowBlur = isDynamic ? 10 : 0;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, cellWidth, cellHeight);
      });
    });
  }, [frames, stepIndex]);

  const currentFrame = frames[stepIndex];

  return (
    <div className={styles.visualizer}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
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
              style={{ backgroundColor: CELL_COLORS[item.key] }}
              aria-hidden="true"
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
