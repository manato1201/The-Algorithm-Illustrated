"use client";

import { useMemo } from "react";
import styles from "./DPTableVisualizer.module.css";
import { PlaybackControls } from "./PlaybackControls";
import { useStepPlayer } from "./useStepPlayer";
import { useWorkerFrames } from "./useWorkerFrames";
import { DP_TABLE_META, type DPCellState, type DPFrame } from "@/lib/dp-visualizers";
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
 * DPテーブルの可視化(0-1ナップサック問題/LCS/編集距離)。ui-design.md 2.6節の状態語彙をCanvasではなくHTML/CSSで表現する。
 * 行・列ヘッダーやチップ表示はDP_TABLE_METAから問題ごとに切り替える(汎用化)。
 * SortVisualizer/PathfindingVisualizerと同じuseStepPlayer/PlaybackControlsを共用。
 */
export function DPTableVisualizer({ algorithmId }: DPTableVisualizerProps) {
  const request = useMemo<WorkerRequest>(() => ({ kind: "dp", algorithmId }), [algorithmId]);
  const { frames, isComputing } = useWorkerFrames<DPFrame>(request);
  const { stepIndex, isFinished, showPause, handlePlayPause, handleStep, reset } =
    useStepPlayer(frames.length);

  const meta = DP_TABLE_META[algorithmId];
  const currentFrame = frames[stepIndex];

  if (!meta) return null;

  return (
    <div className={styles.visualizer}>
      <div className={styles.itemsRow}>
        {meta.chips.map((chip) => (
          <span key={chip} className={styles.itemChip}>
            {chip}
          </span>
        ))}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.cornerHeader}>{meta.cornerLabel}</th>
              {meta.colHeaders.map((label, w) => (
                <th key={w} className={styles.colHeader}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentFrame?.table.map((row, i) => (
              <tr key={i}>
                <th className={styles.rowHeader}>{meta.rowHeaders[i]}</th>
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
