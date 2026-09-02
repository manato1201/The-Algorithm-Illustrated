"use client";

import { useMemo } from "react";
import styles from "./DPTableVisualizer.module.css";
import { PlaybackControls } from "./PlaybackControls";
import { ZoomableStage } from "./ZoomableStage";
import { useStepPlayer } from "./useStepPlayer";
import { useWorkerFrames } from "./useWorkerFrames";
import { ParticleBurstLayer, type ParticleBurst } from "./ParticleBurstLayer";
import { stateColors } from "@/lib/design-tokens";
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
  const { stepIndex, isFinished, showPause, speed, setSpeed, handlePlayPause, handleStep, handleScrub, reset } =
    useStepPlayer(frames.length);

  const meta = DP_TABLE_META[algorithmId];
  const currentFrame = frames[stepIndex];

  const bursts = useMemo<ParticleBurst[]>(() => {
    const frame = frames[stepIndex];
    const previousFrame = frames[stepIndex - 1];
    if (!frame) return [];
    const totalRows = frame.table.length + 1; // +1: ヘッダー行
    const result: ParticleBurst[] = [];

    frame.table.forEach((row, i) => {
      const totalCols = row.length + 1; // +1: 行ヘッダー列
      row.forEach((cell, w) => {
        const previousState = previousFrame?.table[i]?.[w]?.state;
        if (cell.state === "settled" && previousState !== "settled") {
          result.push({
            id: `${stepIndex}-${i}-${w}-settled`,
            xRatio: (w + 1.5) / totalCols,
            yRatio: (i + 1.5) / totalRows,
            color: stateColors.settled,
          });
        }
      });
    });
    return result;
  }, [frames, stepIndex]);

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

      <ZoomableStage>
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
        onPlayPause={handlePlayPause}
        onStep={handleStep}
        onScrub={handleScrub}
        onSpeedChange={setSpeed}
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
