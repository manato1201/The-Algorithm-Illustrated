"use client";

import { useMemo } from "react";
import styles from "./DPTableVisualizer.module.css";
import { PlaybackControls } from "./PlaybackControls";
import { useStepPlayer } from "./useStepPlayer";
import { useWorkerFrames } from "./useWorkerFrames";
import { KNAPSACK_CAPACITY, KNAPSACK_ITEMS, type DPCellState, type DPFrame } from "@/lib/dp-visualizers";
import type { WorkerRequest } from "@/workers/algorithm-worker";

const LEGEND_ITEMS: { key: DPCellState; label: string }[] = [
  { key: "idle", label: "未計算" },
  { key: "comparing", label: "参照中" },
  { key: "pivot", label: "計算中" },
  { key: "settled", label: "確定済み" },
];

type DPTableVisualizerProps = {
  algorithmId: string;
};

/**
 * DPテーブルの可視化(0-1ナップサック問題)。ui-design.md 2.6節の状態語彙をCanvasではなくHTML/CSSで表現する。
 * SortVisualizer/PathfindingVisualizerと同じuseStepPlayer/PlaybackControlsを共用。
 */
export function DPTableVisualizer({ algorithmId }: DPTableVisualizerProps) {
  const request = useMemo<WorkerRequest>(() => ({ kind: "dp", algorithmId }), [algorithmId]);
  const { frames, isComputing } = useWorkerFrames<DPFrame>(request);
  const { stepIndex, isFinished, showPause, handlePlayPause, handleStep, reset } =
    useStepPlayer(frames.length);

  const currentFrame = frames[stepIndex];

  return (
    <div className={styles.visualizer}>
      <div className={styles.itemsRow}>
        {KNAPSACK_ITEMS.map((item) => (
          <span key={item.name} className={styles.itemChip}>
            {item.name}: 重さ{item.weight} / 価値{item.value}
          </span>
        ))}
        <span className={styles.itemChip}>容量: {KNAPSACK_CAPACITY}</span>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.cornerHeader}>品物 \ 容量</th>
              {Array.from({ length: KNAPSACK_CAPACITY + 1 }, (_, w) => (
                <th key={w} className={styles.colHeader}>
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentFrame?.table.map((row, i) => (
              <tr key={i}>
                <th className={styles.rowHeader}>{i === 0 ? "∅" : KNAPSACK_ITEMS[i - 1].name}</th>
                {row.map((cell, w) => (
                  <td key={w} className={styles.cell} data-state={cell.state}>
                    {cell.value ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
          <li key={item.key} className={styles.legendItem} data-legend-state={item.key}>
            <span className={styles.legendSwatch} aria-hidden="true" />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
